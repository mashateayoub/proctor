# x86/v86 Integration Analysis for Proctor (Exam Sandbox)

## Executive Summary
This document analyzes how **v86** (x86-in-the-browser emulator) is built and proposes a concrete integration blueprint for this Next.js + Supabase proctoring platform.

Recommended direction: **browser-embedded exam sandbox** using v86, with server-side orchestration and analytics persistence in Supabase.

Why this fit is strong:
- The project already uses browser-side WebAssembly patterns (`useMediaPipe`), so runtime constraints are familiar.
- Current architecture already separates client runtime behavior from persisted exam/proctoring outcomes.
- v86 can provide deterministic, controlled low-level environments for specialized exam scenarios.

---

## 1) How v86 Is Built

### 1.1 Build stack
From the provided v86 snapshot:
- Core emulator logic is implemented in **Rust** (`src/rust/*`) and compiled to **WebAssembly** (`v86.wasm` / `v86-debug.wasm`).
- Supporting native C libraries (`softfloat`, `zstd`) are compiled to wasm object files and linked into the final wasm.
- JavaScript runtime and browser adapters are bundled via **Closure Compiler** into:
  - `build/v86_all.js` (website runtime)
  - `build/libv86.js` / `build/libv86.mjs` (embeddable API)
- HTML entrypoints (`index.html`, `debug.html`) demonstrate direct browser boot workflows.

### 1.2 Runtime model
v86 runtime is configured with `new V86({...})`, usually including:
- `wasm_path`
- BIOS + VGA BIOS blobs
- Boot media (cdrom/hda/floppy/bzimage/initrd)
- Resource settings (RAM, VGA RAM)
- Optional networking and filesystem adapters

v86 also exposes event-driven interfaces (screen updates, network, serial, storage I/O, emulator lifecycle), plus state save/restore.

### 1.3 Operational implications
- Heavy toolchain needed only when building v86 itself.
- Integration consumers can typically depend on packaged artifacts (`libv86` + `v86.wasm`) and focus on UI/session orchestration.
- Biggest practical costs are asset distribution (images/BIOS), startup latency, and browser performance envelope.

---

## 2) Current Proctor Architecture Fit

### 2.1 Positive compatibility signals
In this repo:
- Next.js app already handles client runtime features and API routes.
- Existing hook `src/hooks/useMediaPipe.ts` loads external WASM runtime assets from CDN and performs continuous client-side inference.
- Existing backend routes and Supabase persistence already support exam/session/report workflows.

### 2.2 Relevant existing execution surface
- `src/app/api/execute/route.ts` currently executes JS/Python/Java server-side via child processes.
- v86 exam sandbox is a different model: **client-side VM execution**, with server responsible for policy, telemetry, and assessment persistence.

### 2.3 Gap areas to address
- Artifact lifecycle: hosting/versioning of BIOS + VM images per exam profile.
- Anti-cheat policy for emulator controls (reset/load state/media injection/fullscreen escape behavior).
- Structured event ingestion pipeline for emulator telemetry into existing analytics model.

---

## 3) Recommended Integration Architecture

### 3.1 High-level design
Adopt a new bounded context: **Exam Sandbox (x86 VM mode)**

Components:
1. **Client Emulator Host**
   - A dedicated client component owns v86 lifecycle (`init/run/stop/destroy`).
   - Receives a signed/authorized boot profile from server.

2. **Session Orchestration API**
   - Provides exam-specific sandbox config (boot image set, memory, allowed controls).
   - Validates user/exam/take authorization.

3. **Telemetry Bridge**
   - Subscribes to emulator and UI control events.
   - Sends normalized events to backend for persistence and analytics.

4. **Supabase Persistence Layer**
   - Stores VM session metadata and event stream linked to existing take/result identity.

### 3.2 Trust boundaries
- Browser VM is **untrusted** for final grading authority.
- Server-authorized profiles and server-side result validation remain source of truth.
- Telemetry informs proctoring/risk signals, not sole security guarantee.

### 3.3 Data model extension (minimal)
Add a table (or equivalent event store) for VM telemetry, linked to existing take/result identity:

Suggested fields:
- `id`
- `take_id` (or `result_id`, matching established source-of-truth design)
- `exam_id`
- `student_id`
- `event_type` (e.g., `vm_started`, `vm_reset_attempt`, `vm_state_restore_blocked`)
- `event_ts`
- `payload_json`

Keep analytics list ordering driven by current `results` flow; overlay VM/proctoring details by relation.

---

## 4) Linux VM Implementation on v86 (copy.sh-style)

This section details how to implement Linux guest environments like copy.sh using two equivalent tracks.

### 4.1 Boot Track A: `bzImage + initrd` (kernel-boot path)

How it works:
- v86 boots Linux kernel directly via `bzimage` plus optional `initrd` and kernel `cmdline`.
- No BIOS-level disk boot dependency for core OS startup.

Primary advantages:
- Faster startup and lower artifact size.
- More deterministic exam boot behavior.
- Smaller attack surface for runtime device/media tampering.

Primary tradeoffs:
- Less OS realism than a full distro disk image.
- Requires curated initrd/rootfs workflow.

Reference profile shape (conceptual):

```ts
interface VmBootProfileKernel {
  mode: "kernel";
  wasmPath: string;
  bios: { url: string };
  vgaBios: { url: string };
  bzimage: { url: string };
  initrd?: { url: string };
  cmdline: string;
  memorySizeMb: number;
  vgaMemoryMb: number;
  network: "restricted_fetch_wisp" | "off";
  policy: VmSessionPolicy;
}
```

### 4.2 Boot Track B: `hda/cdrom` full image (disk-boot path)

How it works:
- VM boots BIOS -> bootloader -> guest OS from `hda` and/or `cdrom` images.
- Closest to classic copy.sh distro experience.

Primary advantages:
- Richer userland and broader compatibility for full Linux distributions.
- More realistic OS behavior for system administration style tasks.

Primary tradeoffs:
- Larger artifacts and slower boot.
- Higher operational complexity and policy surface.

Reference profile shape (conceptual):

```ts
interface VmBootProfileDisk {
  mode: "disk";
  wasmPath: string;
  bios: { url: string };
  vgaBios: { url: string };
  hda?: { url: string; async?: boolean; size?: number };
  cdrom?: { url: string; async?: boolean; size?: number };
  bootOrder: "auto" | "cd-hd" | "hd-cd";
  memorySizeMb: number;
  vgaMemoryMb: number;
  network: "restricted_fetch_wisp" | "off";
  policy: VmSessionPolicy;
}
```

### 4.3 Dual-track decision matrix

| Criterion | Track A (`bzImage+initrd`) | Track B (full image) |
|---|---|---|
| Boot latency | Better | Worse |
| Artifact size | Smaller | Larger |
| Determinism for exams | Higher | Medium |
| Guest realism | Medium | Higher |
| Security hardening effort | Lower | Higher |
| Operational maintenance | Lower | Higher |
| Best for | Timed deterministic labs | Rich OS interaction labs |

### 4.4 Linux artifact production pipeline

Kernel track pipeline:
1. Build or pin known-good kernel (`bzImage`) and initrd/rootfs.
2. Freeze toolchain/package versions.
3. Produce artifact manifest with checksums and compatibility tags.
4. Publish immutable URLs.

Disk track pipeline:
1. Build base distro image with hardened defaults.
2. Preinstall required exam tools and content.
3. Remove unnecessary services/background daemons.
4. Snapshot, compress, hash, and publish immutable image refs.

For both tracks:
- Enforce profile versioning (`profile_id`, `profile_version`).
- Store artifact provenance and checksum metadata.
- Keep rollback map for prior stable profile versions.

### 4.5 Runtime integration contract

Define stable contracts between backend and emulator host:

```ts
type VmBootProfile = VmBootProfileKernel | VmBootProfileDisk;

interface VmSessionPolicy {
  allowReset: boolean;
  allowStateSave: boolean;
  allowStateLoad: boolean;
  allowMediaInsert: boolean;
  allowFullscreenToggle: boolean;
  networkMode: "off" | "restricted_fetch_wisp";
  telemetryLevel: "standard" | "verbose";
}

interface VmTelemetryEvent {
  takeId: string;
  examId: string;
  studentId: string;
  eventType: string;
  ts: number;
  severity: "info" | "warn" | "critical";
  payload: Record<string, unknown>;
}
```

### 4.6 Restricted networking model (`fetch/wisp`)

Required behavior:
- Default to restricted mode, not open internet.
- Allow only explicit destination classes required for exam workflows.
- Block and log disallowed target attempts.
- Disallow guest-hosted public inbound services.

Telemetry required for networking:
- outbound connection attempts (dest class, protocol, outcome)
- blocked policy events
- abnormal burst/scan-like behavior

### 4.7 Filesystem and I/O channel policy

Possible channels:
- serial console
- VGA/canvas output
- optional 9p host-guest file exchange

Exam-safe defaults:
- disable mutable host filesystem mounts unless explicitly needed.
- if 9p is enabled, mount readonly exam assets by default.
- log all upload/download file actions as high-signal events.

---

## 5) Phased Delivery Plan

### Phase 0: Feasibility Spike (dual track)
Goal:
- Validate both Linux tracks on representative devices/browsers.

Outputs:
- Candidate profile matrix for kernel and disk modes.
- Baseline metrics (startup time, memory, CPU, crash/hang rate).

Exit criteria:
- At least one stable profile per track meets minimum thresholds.

### Phase 1: Basic Embed (Non-graded)
Goal:
- Add sandbox page with controlled profile boot and core lifecycle controls.

Outputs:
- Working VM embed for one kernel-mode and one disk-mode profile.
- Lifecycle events persisted to Supabase.

Exit criteria:
- End-to-end session records appear in teacher-facing analytics back-office data.

### Phase 2: Exam Policy Hardening
Goal:
- Apply anti-cheat/policy controls and tamper-aware telemetry.

Outputs:
- Control gating (reset/state/media/network).
- Restricted fetch/wisp networking with enforcement + logs.

Exit criteria:
- Policy bypass attempts consistently blocked/logged and visible.

### Phase 3: Analytics and Intelligence Integration
Goal:
- Integrate VM telemetry into existing teacher results/intelligence workflows.

Outputs:
- Correlated timeline: proctoring anomalies + VM events.
- Per-profile reliability and integrity analytics.

Exit criteria:
- Teacher can distinguish normal VM behavior vs suspicious behavior by take.

---

## 6) Risks and Mitigations

### 6.1 Performance risk
Risk:
- VM boot and runtime can be heavy for low-end devices.

Mitigations:
- Use lightweight curated profiles.
- Prefer kernel-mode profiles for high-scale exams.
- Enforce minimum device/browser requirements.

### 6.2 Asset/security risk
Risk:
- Uncontrolled custom media/state injection can invalidate exam integrity.

Mitigations:
- Strict allowlist of signed profiles.
- Disable risky runtime controls in exam mode.
- Log all blocked/attempted control actions.

### 6.3 Product complexity risk
Risk:
- Teacher UX may be overloaded if VM telemetry is noisy.

Mitigations:
- Define event severity and aggregate summaries.
- Keep default UI concise; expose deep logs on demand.

### 6.4 Browser compatibility risk
Risk:
- Inconsistent behavior across browsers/OS environments.

Mitigations:
- Supported-browser matrix and enforcement.
- Automated smoke checks for each release profile.

---

## 7) Analytics and KPIs

Track at 3 levels: reliability, integrity, and operational outcomes.

### 7.1 Reliability KPIs
- VM boot success rate by profile mode (kernel vs disk).
- Median and P95 time-to-interactive (shell-ready/desktop-ready).
- Session crash/forced-restart rate.
- P95 memory and CPU envelope per profile.

### 7.2 Integrity KPIs
- Count of blocked policy actions per take.
- Rate of repeated violation attempts per student/session.
- Correlation between VM policy events and camera-based anomalies.
- Blocked-network-target rate by exam.

### 7.3 Operational KPIs
- Exam completion rate in VM mode vs non-VM mode.
- Abandonment rate before first answer submission.
- Support incident rate linked to specific VM profiles.

### 7.4 Reporting outputs for teachers/admins
- Per-take integrity summary (low/medium/high risk).
- Per-profile reliability report and health score.
- Top failure causes and affected user segments.

---

## 8) Integration With Existing Proctor Data Flow

Recommended continuity with current design:
- Keep completed-take identity anchored to existing result/take records.
- Overlay VM telemetry and proctoring anomalies onto that base record.
- Maintain existing teacher list ordering/filter logic while adding VM signals as enrichments.

This avoids fragmenting analytics and keeps historical consistency.

---

## 9) Testing Strategy

### Functional tests
- Boot profile loads correctly in both Linux tracks.
- Session start/stop/reload events are emitted and persisted.
- Policy toggles correctly allow/block runtime actions.

### Security/policy tests
- Attempt disallowed actions (state restore, media change, reset spam).
- Attempt restricted/disallowed network flows.
- Verify enforcement and event persistence.

### Performance tests
- Measure startup and steady-state resource usage across target devices.
- Run long-session endurance checks.
- Track kernel panic/hang signatures per profile.

### Data integrity tests
- Validate VM events map to correct take/result.
- Validate teacher analytics queries preserve ordering and include VM enrichments.

---

## 10) Build-vs-Buy and Scope Recommendation

### Recommended near-term scope
- Integrate v86 as a **specialized exam mode**, not universal default.
- Maintain one kernel-track and one disk-track production profile.

### Not recommended initially
- General-purpose arbitrary VM upload by students.
- Open internet guest networking in high-stakes exams.

---

## 11) Decision Summary

Decision:
- Proceed with dual-track feasibility (`bzImage+initrd` and full disk image), then controlled production rollout.

Reasoning:
- Strong technical fit with existing client-side WASM patterns.
- Clear architecture boundary with current Next.js + Supabase model.
- Dual track preserves flexibility while still allowing deterministic, policy-safe exam operations.

If measured performance/reliability falls below threshold on disk-track, default production exams to kernel-track profiles and keep disk-track opt-in.
