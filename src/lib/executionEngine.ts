import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface TestCase {
  label: string;
  input: string;
  expectedOutput: string;
}

export interface TestResult {
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface ExecutionRequest {
  code: string;
  language: string;
  testCases?: TestCase[];
}

export interface ExecutionResponse {
  output?: string;
  error?: boolean;
  executionTime: number;
  testResults?: TestResult[];
  passedCount?: number;
  totalCount?: number;
  provider: "local" | "remote";
  error_code?: "remote_unavailable" | "remote_error" | "unsupported_language";
  upstreamStatus?: number;
  upstreamError?: string;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  go: "go",
  rust: "rs",
  c: "c",
  cpp: "cpp",
  bash: "sh",
};

function getLocalCommand(language: string, filePath: string, tmpDir: string) {
  switch(language) {
    case "javascript":
      return `node "${filePath}"`;
    case "typescript":
      return `npx ts-node "${filePath}"`;
    case "python":
      return `python "${filePath}"`;
    case "java":
      return `javac "${filePath}" && java -cp "${tmpDir}" Main`;
    case "go":
      return `go run "${filePath}"`;
    case "rust": {
      const outPath = path.join(tmpDir, "main_bin");
      return `rustc "${filePath}" -O -o "${outPath}" && "${outPath}"`;
    }
    case "c": {
      const outPath = path.join(tmpDir, "main_c");
      return `gcc "${filePath}" -O2 -o "${outPath}" && "${outPath}"`;
    }
    case "cpp": {
      const outPath = path.join(tmpDir, "main_cpp");
      return `g++ "${filePath}" -O2 -std=c++17 -o "${outPath}" && "${outPath}"`;
    }
    case "bash":
      return `bash "${filePath}"`;
    default:
      return null;
  }
}

async function runLocally(language: string, filePath: string, tmpDir: string, stdinInput?: string) {
  const baseCmd = getLocalCommand(language, filePath, tmpDir);
  if(!baseCmd) {
    return { stdout: "Unsupported language in local fallback mode", error: true };
  }

  let cmd = baseCmd;
  if(stdinInput !== undefined && stdinInput !== "") {
    const escapedInput = stdinInput.replace(/"/g, '\\"');
    if(os.platform() === "win32") {
      cmd = `echo ${escapedInput} | ${baseCmd}`;
    }
    else {
      cmd = `printf "${escapedInput}" | ${baseCmd}`;
    }
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 10_000 });
    return { stdout: String(stdout || stderr).trim(), error: !!stderr && !stdout };
  }
  catch(e: any) {
    return { stdout: String(e.stderr || e.message || "").trim(), error: true };
  }
}

async function executeLocal(req: ExecutionRequest): Promise<ExecutionResponse> {
  const extension = LANGUAGE_EXTENSIONS[req.language];
  if(!extension) {
    return {
      output: "Unsupported language",
      error: true,
      executionTime: 0,
      provider: "local",
      error_code: "unsupported_language",
    };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "proctor-execution-"));
  const start = performance.now();
  const fileName = req.language === "java" ? "Main.java" : `script.${extension}`;
  const filePath = path.join(tmpDir, fileName);
  await fs.writeFile(filePath, req.code);

  try {
    if(req.testCases?.length) {
      const testResults: TestResult[] = [];
      let passedCount = 0;

      for(const tc of req.testCases) {
        const { stdout, error } = await runLocally(req.language, filePath, tmpDir, tc.input);
        const actualOutput = stdout.trim();
        const expectedOutput = tc.expectedOutput.trim();
        const passed = !error && actualOutput === expectedOutput;
        if(passed) passedCount++;

        testResults.push({
          label: tc.label || `Test ${testResults.length + 1}`,
          passed,
          expected: expectedOutput,
          actual: actualOutput,
        });
      }

      return {
        testResults,
        passedCount,
        totalCount: req.testCases.length,
        executionTime: parseFloat((performance.now() - start).toFixed(2)),
        provider: "local",
      };
    }

    const { stdout, error } = await runLocally(req.language, filePath, tmpDir);
    return {
      output: stdout || "No output.",
      error,
      executionTime: parseFloat((performance.now() - start).toFixed(2)),
      provider: "local",
    };
  }
  finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

interface RemoteExecutionResult {
  ok: boolean;
  response?: ExecutionResponse;
  upstreamStatus?: number;
  upstreamError?: string;
}

async function executeRemote(req: ExecutionRequest): Promise<RemoteExecutionResult> {
  const endpoint = process.env.EXECUTION_REMOTE_URL?.trim();
  if(!endpoint) {
    return {
      ok: false,
      upstreamError: "EXECUTION_REMOTE_URL is not configured",
    };
  }

  const remoteToken = process.env.EXECUTION_REMOTE_TOKEN?.trim();

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(remoteToken
          ? { Authorization: `Bearer ${remoteToken}` }
          : {}),
      },
      body: JSON.stringify(req),
    });

    if(!res.ok) {
      let body = "";
      try {
        body = await res.text();
      }
      catch {}
      return {
        ok: false,
        upstreamStatus: res.status,
        upstreamError: body || `Remote returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      response: {
        ...data,
        provider: "remote",
      } as ExecutionResponse,
    };
  }
  catch(e: any) {
    return {
      ok: false,
      upstreamError: e?.message || "Remote request failed",
    };
  }
}

export async function executeCode(req: ExecutionRequest): Promise<ExecutionResponse> {
  const providerPref = process.env.EXECUTION_PROVIDER || "local";
  const strictRemote = (process.env.EXECUTION_REMOTE_STRICT || "true").toLowerCase() === "true";

  if(providerPref === "remote") {
    const remote = await executeRemote(req);
    if(remote.ok && remote.response) {
      return remote.response;
    }

    if(strictRemote) {
      return {
        output: "Remote execution service is unavailable or returned an error.",
        error: true,
        executionTime: 0,
        provider: "remote",
        error_code: remote.upstreamStatus ? "remote_error" : "remote_unavailable",
        upstreamStatus: remote.upstreamStatus,
        upstreamError: remote.upstreamError,
      };
    }
  }
  return executeLocal(req);
}
