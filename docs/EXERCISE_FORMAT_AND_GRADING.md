# Exercise Format and Grading Contract

This project now follows the `sandbox-runner` exercise contract for coding challenges.

## Test Case Object

Each test case must use:

```json
{
  "label": "optional",
  "input": "raw stdin text",
  "expectedOutput": "exact stdout text"
}
```

Rules:
- `input` is the exact stdin passed to the program.
- `expectedOutput` is the exact stdout expected from the program.
- Grading compares `actual` vs `expectedOutput` after `trim()`.
- Avoid prompts/debug logs (for example: `Enter n:`) in student output.
- Keep exercises deterministic (no randomness/network/time-based output).

## Execution Flow (Sync)

- App endpoint: `POST /api/execute`
- Internal mode: `sync` only (async job flow deferred).
- Proxy target: `EXECUTION_REMOTE_URL` (with optional `EXECUTION_REMOTE_TOKEN` bearer auth).

The route returns normalized fields used by app UIs:
- `status`, `errorType`, `runId`
- `executionTime`
- `testResults`, `passedCount`, `totalCount`
- compatibility fields: `output`, `error`

## Authoring Requirements

In teacher exam authoring:
- A test case is valid only when both `input` and `expectedOutput` are provided.
- Partially filled test cases are flagged and blocked from publish.
- Optional `label` is supported and preserved in grading results.
- Starter templates are generated from challenge title/description with a deterministic function name.
- Publish requires a stdin/stdout verification run so test-case transport is validated through the execution engine.

## Known Limits

- Comparison is strict string equality after `trim()`.
- No float-tolerance mode.
- No runner-level hidden/public test split.
- Async execution mode is not enabled in this app yet.

## Source References

- `sandbox-runner/docs/exercise-authoring-format.md`
- `sandbox-runner/docs/exercise-testcases-how-it-works.md`
- `sandbox-runner/docs/recap.md`
