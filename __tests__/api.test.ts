import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/app/api/execute/route';

// We must mock the Next.js Request object class logic for the route handler
const mockNextRequest = (body: any) => {
  return {
    json: async () => body
  } as any;
};

// 1. Mock Node Modules globally to prevent executing actual arbitrary strings during CI tests
vi.mock('fs', () => ({
  promises: {
    mkdtemp: vi.fn().mockResolvedValue('/tmp/mock-dir-123'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  }
}));
vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

vi.mock('child_process', () => ({
  exec: vi.fn((command: string, options: any, callback: any) => {
    // If the test sends a "syntax error" snippet, simulate a python crash
    if (command.includes('SyntaxError')) {
      return callback(new Error('Command failed'), '', 'SyntaxError: invalid syntax');
    }
    // Otherwise return success
    return callback(null, 'Hello World\n', '');
  }),
}));

describe('Serverless Code Execution Endpoint (/api/execute)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Successfully safely wraps and evaluates valid Python Code payload', async () => {
    const req = mockNextRequest({
       language: 'python',
       code: 'print("Hello World")'
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.output.trim()).toBe('Hello World');
    expect(json.error).toBeUndefined();
    // Timing mock ensures executionTime is attached
    expect(json.executionTime).toBeDefined();
  });

  it('Successfully isolates and captures language compilation/syntax errors', async () => {
    const req = mockNextRequest({
       language: 'python',
       code: 'print("SyntaxError")'
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200); // 200 because the route successfully resolved (the *code* failed)
    expect(json.error).toContain('SyntaxError: invalid syntax');
  });

  it('Rejects unknown runtime languages explicitly to protect server environment', async () => {
    const req = mockNextRequest({
       language: 'bash',
       code: 'rm -rf /*'
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400); 
    expect(json.error).toBe('Unsupported language wrapper specified.');
  });
});
