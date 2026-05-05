# Repository Guidelines

## Project Structure & Module Organization
- Main app: `src/` (Next.js App Router, API routes, UI components, lib utilities).
- Static/runtime assets: `public/` (includes `public/v86/` BIOS/WASM/images used by the terminal lab).
- Tests: `__tests__/` (Vitest + Testing Library for API, auth, teacher/student flows, table filters).
- Database and platform config: `supabase/`, `.env.local`, `.env.local.example`.
- Remote execution service: `sandbox-runner/` (separate Node/Fastify service with Docker-backed executors).
- Docs and implementation notes: `docs/` and root markdown files.

## Build, Test, and Development Commands
- `npm run dev` — start the Next.js app locally.
- `npm run build` — production build.
- `npm run start` — run the production build.
- `npm run lint` — run ESLint.
- `npm run test` — run Vitest tests.
- Sandbox runner:
  - `cd sandbox-runner && npm run dev` — run runner in watch mode.
  - `cd sandbox-runner && npm run build && npm run start` — build and run runner.
  - `cd sandbox-runner && docker compose up --build -d` — start runner stack with language images.

## Coding Style & Naming Conventions
- Language: TypeScript-first (`.ts`/`.tsx`) in `src/`.
- Indentation: 4 spaces; keep style consistent with existing files.
- Components: PascalCase (`V86LabPanel.tsx`), hooks/utilities: camelCase.
- Route folders: lowercase and descriptive (`src/app/exam/[id]/page.tsx`).
- Use ESLint config in `eslint.config.mjs`; fix lint issues in touched files before PR.

## Testing Guidelines
- Frameworks: Vitest + `@testing-library/react` + `jsdom`.
- Keep tests in `__tests__/` with `*.test.ts` or `*.test.tsx` naming.
- Prefer behavior-focused tests for teacher/student workflows, API handlers, and table filtering.
- Run `npm run test` before opening a PR; add/update tests for any logic change.

## Commit & Pull Request Guidelines
- Commits: short, imperative, scoped (e.g., `fix: harden v86 cleanup in strict mode`).
- Keep related changes grouped; avoid mixing UI, infra, and DB migrations in one commit when possible.
- PRs should include:
  - clear summary and motivation,
  - linked issue/task,
  - screenshots/GIFs for UI changes,
  - test notes (what was run),
  - env/migration notes if `supabase/`, runner, or `public/v86` assets changed.

## Security & Configuration Tips
- Never commit real secrets; use `.env.local.example` as template.
- Keep runner token/URL aligned between app and `sandbox-runner`.
- Treat `public/v86` binaries/images as versioned runtime dependencies and document updates in PRs.