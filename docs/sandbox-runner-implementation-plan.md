# Sandbox Runner Build Guide (Implementation-Ready)

## Goal
Build a **separate project** named `sandbox-runner` that provides:
- `POST /execute` for universal code execution
- bearer-token auth (`RUNNER_API_TOKEN`)
- Docker-isolated per-job execution

This is the backend that your Proctor app calls via:
- `EXECUTION_REMOTE_URL`
- `EXECUTION_REMOTE_TOKEN`

---

## 1) Project Layout

Create a new repo/folder (outside current Next.js app):

```text
sandbox-runner/
  src/
    server.ts
    routes/execute.ts
    auth.ts
    schema.ts
    executor/
      index.ts
      dockerExecutor.ts
      commands.ts
  docker/
    images/
      node/Dockerfile
      python/Dockerfile
      java/Dockerfile
      go/Dockerfile
      rust/Dockerfile
      c-cpp/Dockerfile
      bash/Dockerfile
  test/
    contract.test.ts
    security.test.ts
  package.json
  tsconfig.json
  Dockerfile
  docker-compose.yml
  .env.example
  README.md
```

---

## 2) Runtime Stack (recommended)

- API: **Fastify + TypeScript**
- Execution: Docker CLI from worker process
- Validation: Zod
- Security: bearer token + strict job limits

Install:

```bash
npm init -y
npm i fastify zod pino
npm i -D typescript tsx @types/node vitest
```

---

## 3) Environment Variables

`.env.example`

```env
PORT=8080
RUNNER_API_TOKEN=replace_with_long_random_secret
RUNNER_MAX_TIMEOUT_MS=10000
RUNNER_MAX_MEMORY_MB=512
RUNNER_MAX_CPUS=1
RUNNER_MAX_PIDS=128
RUNNER_MAX_OUTPUT_BYTES=1048576
RUNNER_ALLOWED_LANGUAGES=javascript,python,java,go,rust,c,cpp,bash
```

Generate token (example):

```bash
openssl rand -hex 32
```

Use this exact token in Proctor as `EXECUTION_REMOTE_TOKEN`.

---

## 4) API Contract (must match Proctor)

### Request
```json
{
  "code": "print('hello')",
  "language": "python",
  "testCases": [
    { "label": "t1", "input": "1 2", "expectedOutput": "3" }
  ]
}
```

### Response (free-run)
```json
{
  "output": "hello",
  "error": false,
  "executionTime": 12.8,
  "provider": "remote"
}
```

### Response (test mode)
```json
{
  "testResults": [
    { "label": "t1", "passed": true, "expected": "3", "actual": "3" }
  ],
  "passedCount": 1,
  "totalCount": 1,
  "executionTime": 30.4,
  "provider": "remote"
}
```

---

## 5) Security Baseline (mandatory)

Each execution must run in a fresh container with:
- `--rm`
- `--network=none`
- `--cpus=${RUNNER_MAX_CPUS}`
- `--memory=${RUNNER_MAX_MEMORY_MB}m`
- `--pids-limit=${RUNNER_MAX_PIDS}`
- `--read-only`
- `--security-opt=no-new-privileges:true`
- non-root user in image
- timeout enforced in runner process

Also enforce:
- max code length
- max stdin length
- max output size
- allowed language whitelist

---

## 6) Language Command Map

Use this v1 command table:

- `javascript`: `node /workspace/Main.js`
- `python`: `python3 /workspace/Main.py`
- `java`: `javac /workspace/Main.java && java -cp /workspace Main`
- `go`: `go run /workspace/Main.go`
- `rust`: `rustc /workspace/Main.rs -O -o /workspace/main && /workspace/main`
- `c`: `gcc /workspace/Main.c -O2 -o /workspace/main && /workspace/main`
- `cpp`: `g++ /workspace/Main.cpp -O2 -std=c++17 -o /workspace/main && /workspace/main`
- `bash`: `bash /workspace/Main.sh`

Write source to temp job dir, mount as `/workspace` read-write only for that container.

---

## 7) Fastify Endpoint Behavior

`POST /execute` flow:
1. Verify `Authorization: Bearer ...` token.
2. Validate request body schema.
3. Check language allowed.
4. If `testCases` exists: run one execution per case with stdin.
5. Compare trimmed output to expected output.
6. Return normalized contract response.

Status codes:
- `200`: execution result
- `400`: malformed request
- `401`: invalid token
- `429`: too many requests
- `500`: internal runner failure

---

## 8) Docker Images

Build one image per runtime in `docker/images/*`.

Example tags:
- `runner-node:1`
- `runner-python:1`
- ...

Pin versions in Dockerfiles (do not use floating latest).

---

## 9) Local Development

`docker-compose.yml` should start:
- runner API container
- optional Redis (if you add queue in v2)

Run locally:

```bash
docker compose up --build
```

Smoke test:

```bash
curl -X POST http://localhost:8080/execute \
  -H "Authorization: Bearer <RUNNER_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"code":"print(7)","language":"python"}'
```

---

## 10) Connect to Proctor App

In Proctor `.env.local`:

```env
EXECUTION_PROVIDER=remote
EXECUTION_REMOTE_URL=http://localhost:8080/execute
EXECUTION_REMOTE_TOKEN=<RUNNER_API_TOKEN>
```

Then the existing `src/lib/executionEngine.ts` will route requests to runner.

---

## 11) Testing Checklist

### Contract tests
- free-run response shape
- test-case response shape
- provider is `remote`

### Security tests
- missing token => 401
- bad token => 401
- blocked language => 400/403
- network access attempt from code => blocked

### Reliability tests
- timeout enforcement
- large-output truncation
- concurrent requests within caps

### Language tests
- hello-world success per language
- compile error behavior
- runtime error behavior

---

## 12) Deployment (v1 -> v2)

### v1 (fast path)
- single VM + Docker
- reverse proxy (Nginx/Caddy)
- HTTPS
- firewall allow only app/backend source IPs if possible

### v2 (scale)
- Kubernetes job/pod worker model
- queue-based execution
- autoscaling by queue depth
- centralized logs/metrics dashboards

---

## 13) Operational Rules

- Rotate `RUNNER_API_TOKEN` periodically.
- Rebuild runtime images on security updates.
- Keep strict allowlist of languages.
- Keep default network disabled for execution jobs.
- Never run jobs on same host namespace as main web app.

---

## 14) What to Build First (order)

1. Fastify API + token auth + request schema
2. Docker executor for Python + JS only
3. Contract compatibility with Proctor app
4. Add remaining languages one by one
5. Add limits, logs, tests, and deployment hardening

This sequence gets you a working universal runner quickly, then hardens it safely.
