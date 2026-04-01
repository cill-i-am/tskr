# Knip Monorepo Integration Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` when delegation is available and explicitly authorized by the user; otherwise use `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Knip as a root-owned monorepo quality gate and wire it into the standard `pnpm check` flow.

**Architecture:** Keep Knip ownership at the repo root so one configuration can analyze all pnpm workspaces consistently. Use targeted workspace-aware configuration to teach Knip about this repo's entrypoints and generated files, then gate the existing root `check` command with the new `knip` script.

**Tech Stack:** pnpm workspaces, Turbo, Knip, TypeScript, Ultracite/Oxlint, Oxfmt

---

## Chunk 1: Root Wiring

### Task 1: Add the root dependency and scripts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add `knip` to root `devDependencies`**

Set the dependency to the current latest stable release and keep the existing
dependency formatting intact.

- [ ] **Step 2: Add a root `knip` script**

Add:

```json
"knip": "knip"
```

- [ ] **Step 3: Update the root `check` script to include Knip**

Change:

```json
"check": "turbo run check"
```

to:

```json
"check": "pnpm knip && turbo run check"
```

- [ ] **Step 4: Run `pnpm install` if the lockfile needs updating**

Run: `pnpm install`

Expected: `package.json` and `pnpm-lock.yaml` reflect the new dependency.

## Chunk 2: Monorepo Configuration

### Task 2: Add the root Knip config

**Files:**

- Create: `knip.json`

- [ ] **Step 1: Create a root `knip.json` with workspace-aware structure**

Start with:

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "workspaces": {
    ".": {},
    "apps/*": {},
    "packages/*": {}
  }
}
```

- [ ] **Step 2: Run Knip once to collect configuration hints**

Run: `pnpm knip`

Expected: Knip reports real issues and/or configuration hints for this repo.

- [ ] **Step 3: Refine `workspaces` entries rather than adding broad ignores**

If Knip reports unconfigured workspaces or noisy unused-file output, add narrow
`entry`, `project`, or workspace-local ignore settings only where needed.

- [ ] **Step 4: Re-run Knip until the config is intentional**

Run: `pnpm knip`

Expected: remaining findings are either fixed in this change or explicitly
addressed by precise config.

## Chunk 3: Documentation

### Task 3: Keep the root workflow docs accurate

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update the root workflow section if needed**

Document that `pnpm check` now includes Knip so the README matches repo
behavior.

- [ ] **Step 2: Keep the wording narrow**

Mention only the new root behavior. Do not restate Knip internals or add a long
tooling tutorial.

## Chunk 4: Final Verification

### Task 4: Verify the integrated check path

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create or Modify: `knip.json`
- Modify: `README.md`

- [ ] **Step 1: Run the targeted Knip command**

Run: `pnpm knip`

Expected: PASS

- [ ] **Step 2: Run the standard root check command**

Run: `pnpm check`

Expected: PASS

- [ ] **Step 3: Run the required repo formatter/fixer**

Run: `pnpm exec ultracite fix`

Expected: PASS, with any required formatting updates applied.

- [ ] **Step 4: Re-run the standard root check command after fixes**

Run: `pnpm check`

Expected: PASS
