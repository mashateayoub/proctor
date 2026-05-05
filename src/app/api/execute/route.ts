import { NextRequest, NextResponse } from 'next/server';

interface TestCase {
    label?: string;
    input: string;
    expectedOutput: string;
}

const SUPPORTED_LANGUAGES = new Set([
    'javascript',
    'python',
    'java',
    'go',
    'rust',
    'c',
    'cpp',
    'bash',
]);

export async function POST(req: NextRequest) {
    try {
        const { code, language, testCases, mode } = await req.json();

        if (!code || !language) {
            return NextResponse.json({ error: 'Code and language are required' }, { status: 400 });
        }

        if (!SUPPORTED_LANGUAGES.has(language)) {
            return NextResponse.json({ error: 'Unsupported language wrapper specified.' }, { status: 400 });
        }

        const executeUrl = process.env.EXECUTION_REMOTE_URL;
        if (!executeUrl) {
            return NextResponse.json({ error: 'Execution engine URL is not configured.' }, { status: 500 });
        }

        const token = (process.env.EXECUTION_REMOTE_TOKEN || '').trim();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const payload: {
            code: string;
            language: string;
            mode: 'sync';
            testCases?: TestCase[];
        } = {
            code,
            language,
            mode: mode === 'async' ? 'sync' : 'sync',
        };

        if (Array.isArray(testCases) && testCases.length > 0) {
            payload.testCases = testCases;
        }

        let upstream: Response;
        try {
            upstream = await fetch(executeUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                cache: 'no-store',
            });
        } catch (networkError: any) {
            return NextResponse.json(
                {
                    output: `Runner unavailable at ${executeUrl}. ${networkError?.message || 'Network error.'}`,
                    error: true,
                    status: 'failed',
                    errorType: 'infra_error',
                },
                { status: 503 },
            );
        }

        const rawText = await upstream.text();
        let data: any = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            return NextResponse.json(
                {
                    error: 'Execution engine returned non-JSON response.',
                    providerStatus: upstream.status,
                    rawBody: rawText.slice(0, 800),
                },
                { status: 502 },
            );
        }

        if (!upstream.ok) {
            const upstreamErrorText =
                data?.output ||
                data?.stderr ||
                data?.error ||
                data?.message ||
                'Execution engine request failed.';

            return NextResponse.json(
                {
                    output: upstreamErrorText,
                    error: true,
                    status: data?.status || 'failed',
                    errorType: data?.errorType || 'infra_error',
                    runId: data?.runId || null,
                    providerStatus: upstream.status,
                },
                { status: upstream.status },
            );
        }

        const normalized = {
            provider: data?.provider ?? 'remote',
            status: data?.status ?? 'completed',
            errorType: data?.errorType ?? 'none',
            runId: data?.runId ?? null,
            jobId: data?.jobId ?? null,
            truncated: Boolean(data?.truncated),
            metrics: data?.metrics ?? null,
            executionTime: data?.executionTime ?? 0,
            testResults: Array.isArray(data?.testResults) ? data.testResults : [],
            passedCount: Number.isFinite(data?.passedCount) ? data.passedCount : 0,
            totalCount: Number.isFinite(data?.totalCount)
                ? data.totalCount
                : Array.isArray(testCases)
                  ? testCases.length
                  : 0,
            output: data?.output ?? data?.stdout ?? 'No output.',
            error:
                data?.error ??
                (data?.errorType && data.errorType !== 'none') ??
                false,
        };

        return NextResponse.json(normalized, { status: upstream.status });
    } catch (error: any) {
        return NextResponse.json({ error: 'Server disruption: ' + error.message }, { status: 500 });
    }
}
