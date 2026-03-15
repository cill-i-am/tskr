# Monorepo and Turbo Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the monorepo's Turbo task graph, cache invalidation, and shared TypeScript configuration without yet converting `@workspace/ui` into a built package.

**Architecture:** Keep the current repo behavior intact while making Turbo reflect real package responsibilities. Improve package-level task ownership, root config hashing, and shared TypeScript inheritance now, and explicitly preserve the current `@workspace/ui` source-consumption model as a temporary state until the next task introduces a real built package boundary.

**Tech Stack:** pnpm workspace, Turborepo, TanStack Start, React, TypeScript, Ultracite, Oxfmt, Oxlint

---

## Chunk 1: Turbo task graph and package script ownership

### Task 1: Replace root-only quality workflow with package-owned Turbo tasks

**Files:**

- Modify: `package.json`
- Modify: `turbo.json`
- Modify: `apps/web/package.json`
- Modify: `packages/ui/package.json`
- Test: root command verification from repo root

- [ ] **Step 1: Write the failing test**

Use command probes to capture the current mismatch between root scripts and package-owned tasks:

```bash
pnpm --filter web run check
pnpm --filter @workspace/ui run check
```

Expected today: both commands fail because neither package defines a `check` script.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web run check
```

Expected: failure indicating missing script `check`.

Run:

```bash
pnpm --filter @workspace/ui run check
```

Expected: failure indicating missing script `check`.

- [ ] **Step 3: Write minimal implementation**

Update scripts so Turbo owns the graph and packages own their tasks:

- In `apps/web/package.json`
  - add `check` script that runs the package-local verification command
  - keep `typecheck`
  - keep `build` and `dev`
- In `packages/ui/package.json`
  - add `check` script that runs the package-local verification command
  - keep `typecheck`
- In root `package.json`
  - change `check` from direct `pnpm exec ultracite check` to `turbo run check`
  - keep `fix` root-only because it is intentionally repo-wide formatting/autofix
  - keep `typecheck` as `turbo run typecheck`
- In `turbo.json`
  - remove `//#check`
  - add real `check` task
  - decide dependency shape:
    - if `check` is only package-local source analysis, prefer a transit-node pattern or no `^check`
    - avoid fake dependency chains that imply upstream package artifacts
  - keep `//#fix` only if you still need a documented root-only pseudo-task; otherwise remove it and let `fix` stay outside Turbo entirely

Recommended package-local `check` shape for this repo:

- `apps/web`: `pnpm exec ultracite check .`
- `packages/ui`: `pnpm exec ultracite check .`

Keep the current deferred UI-package model intact:

- do not add a `packages/ui` build task yet
- do not remove the `@workspace/ui/*` TS path alias yet

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web run check
pnpm --filter @workspace/ui run check
pnpm check
```

Expected:

- package-level `check` scripts run successfully
- root `pnpm check` delegates through Turbo and succeeds

- [ ] **Step 5: Commit**

```bash
git add package.json turbo.json apps/web/package.json packages/ui/package.json
git commit -m "chore: move workspace checks into turbo"
```

### Task 2: Align Turbo task definitions with current package reality

**Files:**

- Modify: `turbo.json`
- Test: Turbo dry-run or summarized graph inspection

- [ ] **Step 1: Write the failing test**

Use Turbo dry output to inspect the current misleading graph:

```bash
pnpm turbo run build --dry=json
```

Expected today:

- `build` is modeled with `^build`
- `packages/ui` contributes no actual build task even though `web` depends on it

- [ ] **Step 2: Run test to verify the mismatch**

Run:

```bash
pnpm turbo run build --dry=json
```

Expected: output shows current task planning; capture whether the graph still assumes upstream `build` behavior that the repo does not yet support.

- [ ] **Step 3: Write minimal implementation**

Adjust `turbo.json` so the graph matches the current repo state:

- Keep `apps/web` as the only actual build-producing workspace for now
- Do not introduce `packages/ui` build behavior yet
- Revisit `build.dependsOn`
  - either leave `^build` only if it does not create misleading expectations in practice
  - or replace with package-specific reality, such as a base `build` task with package-local outputs and no implied upstream library build until `ui` becomes built
- Keep the change small and explicitly temporary, because the next task will convert `@workspace/ui` into a built package

Add a short comment in the plan execution notes or docs if needed:

- current build graph is intentionally transitional until `@workspace/ui` becomes a built package

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm turbo run build --dry=json
pnpm build
```

Expected:

- dry-run output reflects the intended current graph
- actual build still succeeds for the repo as currently structured

- [ ] **Step 5: Commit**

```bash
git add turbo.json
git commit -m "chore: align turbo build graph with current packages"
```

## Chunk 2: Cache inputs, outputs, and invalidation rules

### Task 3: Add focused global cache invalidation for shared root config

**Files:**

- Modify: `turbo.json`
- Test: Turbo dry-run/hash input inspection

- [ ] **Step 1: Write the failing test**

Use the current config as the failing state:

- `turbo.json` does not declare root config files as `globalDependencies`

Verification command:

```bash
pnpm turbo run typecheck --dry=json
```

Expected today: no explicit root config invalidation coverage for files like `tsconfig.json`, `pnpm-workspace.yaml`, or `.oxlintrc.json`.

- [ ] **Step 2: Run test to verify current state**

Run:

```bash
pnpm turbo run typecheck --dry=json
```

Expected: inspect task hash inputs and confirm shared root config is not being tracked globally.

- [ ] **Step 3: Write minimal implementation**

Add focused `globalDependencies` in `turbo.json` for root files that materially affect many tasks. Recommended initial set:

- `tsconfig.json`
- `pnpm-workspace.yaml`
- `.oxlintrc.json`
- `.oxfmtrc.jsonc`
- `package.json`

Do not add broad patterns that cause unnecessary invalidation.
Do not move `.env*` into `globalDependencies`; keep env invalidation task-local.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm turbo run typecheck --dry=json
```

Expected: dry-run output reflects the new shared hash inputs.

- [ ] **Step 5: Commit**

```bash
git add turbo.json
git commit -m "chore: track shared root config in turbo hashes"
```

### Task 4: Correct build outputs for the current app build

**Files:**

- Modify: `turbo.json`
- Test: actual build output verification

- [ ] **Step 1: Write the failing test**

Capture the current mismatch:

- root Turbo `build.outputs` only includes `.output/**`
- repo `.gitignore` suggests the app may also emit `.tanstack`, `.nitro`, or `.vinxi`

Verification commands:

```bash
pnpm build
test -d apps/web/.output || test -d apps/web/.tanstack || test -d apps/web/.vinxi || test -d apps/web/.nitro
```

Expected today: build may succeed, but cached outputs in `turbo.json` may not fully reflect the directories actually produced.

- [ ] **Step 2: Run test to verify current output behavior**

Run:

```bash
pnpm build
```

Then inspect generated directories in `apps/web`.

Expected: identify the actual output directories used by the current TanStack Start/Nitro build.

- [ ] **Step 3: Write minimal implementation**

Update `turbo.json` `build.outputs` to match what the current app really writes.
Prefer exact directories, for example:

- `.output/**`
- `.tanstack/**`
- `.nitro/**`
- `.vinxi/**`

Only include outputs actually produced by the build or needed for cache restoration.
If outputs differ by package, consider a future package-specific Turbo config, but keep this change minimal for now.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm build
pnpm turbo run build --dry=json
```

Expected:

- build succeeds
- declared outputs match observed outputs closely enough for reliable caching

- [ ] **Step 5: Commit**

```bash
git add turbo.json
git commit -m "chore: fix turbo build output caching"
```

## Chunk 3: Shared TypeScript config inheritance

### Task 5: Make workspace tsconfigs extend the root base config

**Files:**

- Modify: `tsconfig.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `packages/ui/tsconfig.json`
- Test: package typecheck commands

- [ ] **Step 1: Write the failing test**

Use duplication as the failing condition:

- both workspace tsconfigs repeat root settings instead of extending the shared base

Behavioral verification commands:

```bash
pnpm --filter web run typecheck
pnpm --filter @workspace/ui run typecheck
```

Expected today: commands pass, but config duplication remains.

- [ ] **Step 2: Run test to establish baseline**

Run:

```bash
pnpm --filter web run typecheck
pnpm --filter @workspace/ui run typecheck
```

Expected: both pass before the refactor, establishing a safe baseline.

- [ ] **Step 3: Write minimal implementation**

Refactor TypeScript config structure:

- Keep shared compiler behavior in root `tsconfig.json`
  - `target`
  - `module`
  - `moduleResolution`
  - `strict`
  - `skipLibCheck`
- Update `apps/web/tsconfig.json` to `extends` the root config and keep only app-specific settings:
  - JSX mode
  - Vite types
  - app `lib`
  - `allowImportingTsExtensions`
  - `verbatimModuleSyntax`
  - `noEmit`
  - `noUnused*`
  - `noUncheckedSideEffectImports`
  - `allowJs`
  - `baseUrl`
  - `paths`
  - `include`
- Update `packages/ui/tsconfig.json` to `extends` the root config and keep only package-specific settings:
  - JSX mode
  - package `lib`
  - `noEmit`
  - `baseUrl`
  - `paths`
  - `include` / `exclude`

Do not change the UI path alias yet.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web run typecheck
pnpm --filter @workspace/ui run typecheck
pnpm typecheck
```

Expected: all commands still pass with the cleaner inheritance structure.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json apps/web/tsconfig.json packages/ui/tsconfig.json
git commit -m "chore: share typescript config across workspaces"
```

### Task 6: Fix app config-file coverage in the web tsconfig

**Files:**

- Modify: `apps/web/tsconfig.json`
- Test: app typecheck

- [ ] **Step 1: Write the failing test**

Use the wrong include entry as the failing condition:

- `apps/web/tsconfig.json` includes `vite.config.js`, but the repo uses `vite.config.ts`

Verification command:

```bash
pnpm --filter web run typecheck
```

Expected today: command may still pass, but the config file coverage is incorrect.

- [ ] **Step 2: Run test to establish baseline**

Run:

```bash
pnpm --filter web run typecheck
```

Expected: passes before the fix.

- [ ] **Step 3: Write minimal implementation**

Update `apps/web/tsconfig.json` `include` entries:

- replace `vite.config.js` with `vite.config.ts`
- remove obviously stale config includes if they no longer exist, such as `eslint.config.js` or `prettier.config.js`, unless there is a deliberate reason to keep JS config coverage enabled

Keep the include list intentional and minimal.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web run typecheck
```

Expected: still passes, now with the correct config file coverage.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tsconfig.json
git commit -m "chore: fix web tsconfig config-file includes"
```

## Chunk 4: Documentation and deferred UI build follow-up

### Task 7: Document the temporary transitional state and next step

**Files:**

- Modify: `README.md`
- Test: doc content review

- [ ] **Step 1: Write the failing test**

Use doc-grep checks for missing guidance:

```bash
rg "Turbo|check|typecheck|@workspace/ui|built package" README.md
```

Expected today:

- README documents dev and Ultracite basics
- README does not explain the current temporary source-consumption state or the planned `@workspace/ui` built-package follow-up

- [ ] **Step 2: Run test to verify the gap**

Run:

```bash
rg "Turbo|check|typecheck|@workspace/ui|built package" README.md
```

Expected: little or no guidance on the monorepo/Turbo model.

- [ ] **Step 3: Write minimal implementation**

Update `README.md` to document:

- root workflow commands:
  - `pnpm check`
  - `pnpm typecheck`
  - `pnpm build`
- that package-level checks now run through Turbo
- that `@workspace/ui` is still temporarily consumed as shared source during this hardening pass
- that the next planned task is to convert `@workspace/ui` into a real built package with a stable package boundary

Keep this concise; avoid overexplaining implementation details.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rg "pnpm check|pnpm typecheck|pnpm build|@workspace/ui|built package" README.md
```

Expected: the new guidance is present.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document monorepo hardening workflow"
```

## Final verification

### Task 8: Run end-to-end verification for the hardening pass

**Files:**

- Modify: none expected, unless fixes are required from verification

- [ ] **Step 1: Run repository fix command**

Run:

```bash
pnpm exec ultracite fix
```

Expected: formatting/lint autofixes apply cleanly.

- [ ] **Step 2: Run package and repo verification**

Run:

```bash
pnpm check
pnpm typecheck
pnpm build
```

Expected:

- all commands pass
- Turbo runs package-owned tasks
- current build outputs are cached correctly
- TS config inheritance does not break the app or UI package

- [ ] **Step 3: Sanity-check Turbo graph**

Run:

```bash
pnpm turbo run check --dry=json
pnpm turbo run typecheck --dry=json
pnpm turbo run build --dry=json
```

Expected:

- graph matches package ownership
- no misleading root-only check task remains
- build graph is intentionally transitional, not accidentally inconsistent

- [ ] **Step 4: Commit verification fallout if needed**

If verification required no further changes, no extra commit is needed.
If verification required small follow-up fixes, commit them separately:

```bash
git add <files>
git commit -m "chore: finish monorepo hardening verification"
```

## Notes for the next task

- The repo owner intends to move `@workspace/ui` to a real built package next.
- That follow-up should:
  - add a `packages/ui` build task
  - emit types and runtime output
  - switch app consumption away from `../../packages/ui/src/*`
  - revisit Turbo `build.dependsOn` to restore the proper upstream library build graph
