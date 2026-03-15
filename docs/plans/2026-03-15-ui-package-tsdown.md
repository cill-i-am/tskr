# UI Package TSDown Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `@workspace/ui` into a self-contained built package that emits ESM, declarations, and a stable CSS entry while preserving automatic propagation into `apps/web` during development.

**Architecture:** `packages/ui` becomes a real library built with `tsdown` into `dist/`, with explicit package exports and no app-source scanning. `apps/web` stops consuming UI source through TS path aliases and instead consumes only built package exports, while Turbo orchestrates a watch-based dev flow so UI changes rebuild automatically and flow into the app.

**Tech Stack:** pnpm workspace, Turborepo, tsdown, TypeScript, React, Tailwind CSS v4, TanStack Start, Ultracite

---

## Chunk 1: Package boundary and build foundation

### Task 1: Add tsdown-based build config for `packages/ui`

**Files:**

- Create: `packages/ui/tsdown.config.ts`
- Modify: `packages/ui/package.json`
- Modify: `turbo.json`
- Test: `packages/ui` build and package-level dry runs

- [ ] **Step 1: Write the failing test**

Run:

```bash
pnpm --filter @workspace/ui run build
```

Expected: fail because `packages/ui` has no `build` script.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @workspace/ui run build
```

Expected: missing script error.

- [ ] **Step 3: Write minimal implementation**

Add the first real library build setup:

- `packages/ui/tsdown.config.ts`
  - explicit `entry` config for JS entrypoints
  - ESM output only
  - `dts: true`
  - `outDir: "dist"`
  - keep dependencies external
- `packages/ui/package.json`
  - add `build` script using `tsdown`
  - add `dev` script using `tsdown --watch`
  - add `types`, `files`, and explicit `exports` that point to built artifacts
  - keep `check` and `typecheck`
- `turbo.json`
  - restore a real `build` task for packages
  - remove the temporary `web#build`-only workaround in favor of package-aware build orchestration
  - define outputs for `packages/ui` build artifacts

Preserve current import compatibility in this task by keeping the planned subpath `@workspace/ui/components/button` in the export map.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @workspace/ui run build
pnpm turbo run build --dry=json
```

Expected:

- `packages/ui` builds into `dist/`
- Turbo dry run shows a real `@workspace/ui#build`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/tsdown.config.ts packages/ui/package.json turbo.json
git commit -m "feat: add tsdown build for ui package"
```

### Task 2: Define explicit library entry files and stop self-import aliasing

**Files:**

- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/components/button-entry.ts`
- Modify: `packages/ui/src/components/button.tsx`
- Modify: `packages/ui/package.json`
- Test: package build and typecheck

- [ ] **Step 1: Write the failing test**

Run:

```bash
pnpm --filter @workspace/ui run typecheck
pnpm --filter @workspace/ui run build
```

Expected: current package still relies on source-glob exports and self-import aliasing.

- [ ] **Step 2: Run test to establish baseline**

Run the same commands and note current behavior.

- [ ] **Step 3: Write minimal implementation**

- add `src/index.ts` as the root entry
- add an explicit compatibility subpath entry at `packages/ui/src/components/button-entry.ts` for the button export
- change `packages/ui/src/components/button.tsx` to use relative imports instead of `@workspace/ui/lib/utils`
- update `packages/ui/package.json` exports so they reference built files in `dist/`, not source globs

Do not add unnecessary public surface beyond the agreed entrypoints.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @workspace/ui run typecheck
pnpm --filter @workspace/ui run build
```

Expected: package typechecks and builds with explicit entrypoints.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/index.ts packages/ui/src/components/button-entry.ts packages/ui/src/components/button.tsx packages/ui/package.json
git commit -m "feat: define explicit ui package entrypoints"
```

## Chunk 2: CSS ownership and dependency cleanup

### Task 3: Make `packages/ui` CSS self-contained

**Files:**

- Modify: `packages/ui/src/styles/globals.css`
- Modify: `packages/ui/tsdown.config.ts`
- Modify: `packages/ui/package.json`
- Create: `apps/web/src/styles/app.css`
- Modify: `apps/web/src/routes/__root.tsx`
- Test: package build and app CSS consumption compatibility

- [ ] **Step 1: Write the failing test**

Run:

```bash
rg "@source ../../../apps" packages/ui/src/styles/globals.css
test -f apps/web/src/styles/app.css
```

Expected today:

- `rg` finds the app-scanning directive in `packages/ui/src/styles/globals.css`
- `test -f apps/web/src/styles/app.css` fails because the app-owned stylesheet does not exist yet

- [ ] **Step 2: Run test to establish baseline**

Run the commands above and confirm the current CSS ownership problem.

- [ ] **Step 3: Write minimal implementation**

- remove app-level `@source` directives from `packages/ui/src/styles/globals.css`
- keep only UI-package scanning in package CSS
- create `apps/web/src/styles/app.css` as the app-owned stylesheet entrypoint
- move app `@source` scanning into `apps/web/src/styles/app.css`
- load `apps/web/src/styles/app.css?url` from `apps/web/src/routes/__root.tsx` so the app-owned stylesheet is part of the real CSS graph
- configure tsdown CSS output so `@workspace/ui/globals.css` remains a real built package entry
- preserve the app's existing `?url` CSS consumption pattern

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rg "@source ../../../apps" packages/ui/src/styles/globals.css
rg "@source" apps/web/src/styles/app.css
pnpm --filter @workspace/ui run build
```

Expected:

- `rg "@source ../../../apps"` returns no matches in package CSS
- `apps/web/src/styles/app.css` exists and owns app scanning
- package build emits a stable CSS artifact without depending on app source paths

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/styles/globals.css packages/ui/tsdown.config.ts packages/ui/package.json apps/web/src/styles/app.css apps/web/src/routes/__root.tsx
git commit -m "feat: make ui package styles self-contained"
```

### Task 4: Move font ownership to `apps/web` and tighten package dependencies

**Files:**

- Modify: `packages/ui/package.json`
- Modify: `packages/ui/src/styles/globals.css`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/styles/app.css`
- Create: `apps/web/src/styles/fonts.css`
- Modify: `apps/web/src/routes/__root.tsx`
- Test: app build and CSS loading

- [ ] **Step 1: Write the failing test**

Run:

```bash
rg "fontsource-variable/geist" packages/ui/src/styles/globals.css packages/ui/package.json
test -f apps/web/src/styles/fonts.css
```

Expected today:

- `rg` finds Geist ownership in `packages/ui`
- `test -f apps/web/src/styles/fonts.css` fails because the app font stylesheet does not exist yet

- [ ] **Step 2: Run test to establish baseline**

Run the commands above and confirm current font ownership.

- [ ] **Step 3: Write minimal implementation**

- remove Geist ownership from `packages/ui`
- add Geist ownership to `apps/web`
- add `apps/web/src/styles/fonts.css` as the app-owned font entrypoint
- update `apps/web/src/styles/app.css` to import `./fonts.css`
- preserve the package CSS contract by continuing to load `@workspace/ui/globals.css?url` from `apps/web/src/routes/__root.tsx`
- keep `apps/web/src/styles/app.css?url` loaded from `apps/web/src/routes/__root.tsx` so app-owned scanning and font CSS remain active alongside package CSS
- move `react` and `react-dom` to `peerDependencies` in `packages/ui`
- remove packages that do not belong in the UI runtime contract unless implementation proves they are still required

Make a note in code or docs only if needed; the main requirement is the actual dependency boundary.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rg "fontsource-variable/geist" packages/ui/src/styles/globals.css packages/ui/package.json
rg "fontsource-variable/geist" apps/web/src/styles/fonts.css apps/web/package.json
pnpm --filter @workspace/ui run build
pnpm --filter web run build
```

Expected:

- `rg` returns no Geist ownership in `packages/ui`
- `rg` finds Geist ownership in `apps/web`
- package and app builds both succeed with font ownership in `web`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/package.json packages/ui/src/styles/globals.css apps/web/package.json apps/web/src/styles/app.css apps/web/src/styles/fonts.css apps/web/src/routes/__root.tsx
git commit -m "refactor: move font ownership to web app"
```

## Chunk 3: Consumer migration and Turbo orchestration

### Task 5: Switch `apps/web` to built package consumption

**Files:**

- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/routes/__root.tsx`
- Test: app typecheck and build

- [ ] **Step 1: Write the failing test**

Use current config as the failing condition:

- `apps/web/tsconfig.json` still maps `@workspace/ui/*` to `../../packages/ui/src/*`

Verification commands:

```bash
pnpm --filter web run typecheck
pnpm --filter web run build
```

Expected today: app still relies on the UI source alias.

- [ ] **Step 2: Run test to establish baseline**

Run the same commands and confirm current alias-backed success.

- [ ] **Step 3: Write minimal implementation**

- remove the UI source alias from `apps/web/tsconfig.json`
- keep app-local aliases intact
- ensure current component and CSS imports resolve through package exports only
- adjust imports only if needed to match the explicit built package export map

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web run typecheck
pnpm --filter web run build
```

Expected: the app succeeds without any path-based reach into `packages/ui/src/*`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tsconfig.json apps/web/src/routes/index.tsx apps/web/src/routes/__root.tsx
git commit -m "feat: consume built ui package from web"
```

### Task 6: Add dev propagation workflow for UI watch + web dev

**Files:**

- Modify: `packages/ui/package.json`
- Modify: `apps/web/package.json`
- Modify: `turbo.json`
- Create: `packages/ui/turbo.json`
- Test: Turbo dry run and dev workflow commands

- [ ] **Step 1: Write the failing test**

Run:

```bash
pnpm turbo run dev --dry=json
pnpm --filter @workspace/ui run dev
```

Expected today:

- Turbo dry run does not yet show a truthful `ui` watch + `web` dev orchestration
- `pnpm --filter @workspace/ui run dev` fails until the new watch script exists

- [ ] **Step 2: Run test to establish baseline**

Run the commands above and capture current task orchestration.

- [ ] **Step 3: Write minimal implementation**

- add a persistent `dev` script in `packages/ui` using `tsdown --watch`
- make Turbo orchestrate `packages/ui#dev` and `web#dev` together in a truthful way
- use `packages/ui/turbo.json` for package-specific task overrides if needed to keep root config cleaner
- keep build-time dependencies correct now that `packages/ui` has a real build

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm turbo run dev --dry=json
pnpm --filter @workspace/ui run dev -- --help
```

Expected: Turbo and package scripts now expose a real propagation workflow.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/package.json apps/web/package.json turbo.json packages/ui/turbo.json
git commit -m "feat: add ui watch workflow for app propagation"
```

## Chunk 4: Packed artifact validation and final verification

### Task 7: Validate the built package as a packaged artifact

**Files:**

- Modify: `packages/ui/package.json` only if needed for packaging correctness
- Test: package tarball inspection

- [ ] **Step 1: Write the failing test**

Run:

```bash
pnpm --filter @workspace/ui pack --pack-destination /tmp/tskr-ui-pack-test
tar -tf /tmp/tskr-ui-pack-test/*.tgz | rg "package/dist/(index|components/button-entry|globals\.css)"
```

Expected today: the tarball check fails until packaging metadata and outputs are fully correct.

- [ ] **Step 2: Run test to establish baseline**

Run the commands above and capture the missing built-artifact or export-contract problem.

- [ ] **Step 3: Write minimal implementation**

- fix any `files`, `types`, or export-map issues revealed by packing
- ensure the tarball includes built JS, `.d.ts`, CSS, and package metadata
- if practical, add a package validation command such as `publint` against the packed artifact

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @workspace/ui pack --pack-destination /tmp/tskr-ui-pack-test
tar -tf /tmp/tskr-ui-pack-test/*.tgz
```

Expected: the tarball contains the expected built package contents and no source-only dependency on app files.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/package.json
git commit -m "chore: validate packaged ui artifact"
```

### Task 8: Run final repository verification

**Files:**

- Modify: none expected unless verification fallout requires small fixes

- [ ] **Step 1: Run repository fix command**

Run:

```bash
pnpm exec ultracite fix
```

Expected: autofix completes cleanly.

- [ ] **Step 2: Run repo verification**

Run:

```bash
pnpm check
pnpm typecheck
pnpm build
```

Expected: all repository verification commands pass.

- [ ] **Step 3: Run package-specific verification**

Run:

```bash
pnpm --filter @workspace/ui run build
pnpm --filter @workspace/ui run typecheck
pnpm --filter web run build
pnpm --filter web run typecheck
```

Expected: the package and app both succeed independently.

- [ ] **Step 4: Run browser-driven dev-propagation verification**

Run the UI watch process and web dev process together, make a visible UI change, and use a browser-controlled smoke check to confirm the app updates from built artifacts without relinking.

This is required acceptance criteria, not optional. If browser tooling is not yet wired into the repo, add the minimum tooling or script needed to perform this check as part of the implementation.

- [ ] **Step 5: Commit verification fallout if needed**

```bash
git add <files>
git commit -m "chore: finish ui package tsdown migration"
```
