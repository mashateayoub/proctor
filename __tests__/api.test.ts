import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../src/app/api/execute/route';

const originalEnv = process.env;

const mockNextRequest = (body: any) =>
    ({
        json: async () => body,
    }) as any;

describe('Execution API route (/api/execute)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        process.env = { ...originalEnv };
        process.env.EXECUTION_REMOTE_URL = 'https://runner.example.com/execute';
        process.env.EXECUTION_REMOTE_TOKEN = 'secret-token';
    });

    it('forwards sync execution and returns normalized free-run output', async () => {
        const fetchMock = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    provider: 'remote',
                    status: 'completed',
                    errorType: 'none',
                    output: 'Hello runner',
                    executionTime: 12,
                    runId: 'run_123',
                }),
        } as any);

        const response = await POST(
            mockNextRequest({
                language: 'python',
                code: 'print("hello")',
            }),
        );
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.output).toBe('Hello runner');
        expect(json.error).toBe(false);
        expect(json.status).toBe('completed');
        expect(json.errorType).toBe('none');
        expect(json.runId).toBe('run_123');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('forwards test cases and returns verdict fields', async () => {
        vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            status: 200,
            text: async () =>
                JSON.stringify({
                    status: 'completed',
                    errorType: 'none',
                    testResults: [{ label: 'case 1', passed: true, expected: '10', actual: '10' }],
                    passedCount: 1,
                    totalCount: 1,
                    executionTime: 18,
                }),
        } as any);

        const response = await POST(
            mockNextRequest({
                language: 'python',
                code: 'n = int(input()); print(n*2)',
                testCases: [{ label: 'case 1', input: '5', expectedOutput: '10' }],
            }),
        );
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.passedCount).toBe(1);
        expect(json.totalCount).toBe(1);
        expect(json.testResults).toHaveLength(1);
        expect(json.error).toBe(false);
    });

    it('rejects unsupported languages before calling runner', async () => {
        const fetchMock = vi.spyOn(global, 'fetch' as any);

        const response = await POST(
            mockNextRequest({
                language: 'perl',
                code: 'print 1',
            }),
        );
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Unsupported language wrapper specified.');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps upstream errors to client error payload', async () => {
        vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: false,
            status: 429,
            text: async () =>
                JSON.stringify({
                    error: 'Rate limit exceeded',
                    status: 'failed',
                    errorType: 'infra_error',
                    runId: 'run_rl_1',
                }),
        } as any);

        const response = await POST(
            mockNextRequest({
                language: 'python',
                code: 'print(1)',
            }),
        );
        const json = await response.json();

        expect(response.status).toBe(429);
        expect(json.error).toBe('Rate limit exceeded');
        expect(json.status).toBe('failed');
        expect(json.errorType).toBe('infra_error');
        expect(json.runId).toBe('run_rl_1');
    });
});
