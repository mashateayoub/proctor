import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface TestCase {
  label: string;
  input: string;
  expectedOutput: string;
}

interface TestResult {
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

/**
 * Executes a code file with optional stdin input.
 * Returns { stdout, error }
 */
async function runCode(
  language: string,
  filePath: string,
  tmpDir: string,
  stdinInput?: string
): Promise<{ stdout: string; error: boolean }> {
  let cmd = '';
  
  if (language === 'javascript') {
    cmd = `node "${filePath}"`;
  } else if (language === 'python') {
    cmd = `python "${filePath}"`;
  } else if (language === 'java') {
    // Compile first
    try {
      await execAsync(`javac "${filePath}"`, { timeout: 5000 });
    } catch (e: any) {
      return { stdout: e.stderr || e.message, error: true };
    }
    cmd = `java -cp "${tmpDir}" Main`;
  } else {
    return { stdout: 'Unsupported language', error: true };
  }

  try {
    const options: any = { timeout: 5000 };
    
    // If we have stdin input, pipe it via echo
    if (stdinInput !== undefined && stdinInput !== '') {
      // Use echo to pipe input safely across platforms
      const escapedInput = stdinInput.replace(/"/g, '\\"');
      const isWindows = os.platform() === 'win32';
      if (isWindows) {
        cmd = `echo ${escapedInput} | ${cmd}`;
      } else {
        cmd = `printf "${escapedInput}" | ${cmd}`;
      }
    }

    const { stdout, stderr } = await execAsync(cmd, options);
    return { stdout: String(stdout || stderr).trim(), error: !!stderr && !stdout };
  } catch (e: any) {
    return { stdout: String(e.stderr || e.message || '').trim(), error: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, language, testCases } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required' }, { status: 400 });
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'proctor-execution-'));
    const startTime = performance.now();

    // Write the code file once
    let filePath = '';
    if (language === 'javascript') {
      filePath = path.join(tmpDir, 'script.js');
    } else if (language === 'python') {
      filePath = path.join(tmpDir, 'script.py');
    } else if (language === 'java') {
      filePath = path.join(tmpDir, 'Main.java');
    } else {
      await fs.rm(tmpDir, { recursive: true, force: true });
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    await fs.writeFile(filePath, code);

    try {
      // ── TEST MODE: Run against each test case ──
      if (testCases && Array.isArray(testCases) && testCases.length > 0) {
        const testResults: TestResult[] = [];
        let passedCount = 0;

        for (const tc of testCases as TestCase[]) {
          const { stdout, error: hasError } = await runCode(language, filePath, tmpDir, tc.input);
          const actualOutput = stdout.trim();
          const expectedOutput = tc.expectedOutput.trim();
          const passed = !hasError && actualOutput === expectedOutput;
          
          if (passed) passedCount++;

          testResults.push({
            label: tc.label || `Test ${testResults.length + 1}`,
            passed,
            expected: expectedOutput,
            actual: actualOutput,
          });
        }

        const executionTime = parseFloat((performance.now() - startTime).toFixed(2));

        return NextResponse.json({
          testResults,
          passedCount,
          totalCount: testCases.length,
          executionTime,
        });
      }

      // ── FREE-RUN MODE: Execute as-is (no test validation) ──
      const { stdout, error: hasError } = await runCode(language, filePath, tmpDir);
      const executionTime = parseFloat((performance.now() - startTime).toFixed(2));

      return NextResponse.json({
        output: stdout || 'No output.',
        error: hasError,
        executionTime,
      });

    } finally {
      // Cleanup temp directory aggressively
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

  } catch (error: any) {
    return NextResponse.json({ error: 'Server disruption: ' + error.message }, { status: 500 });
  }
}
