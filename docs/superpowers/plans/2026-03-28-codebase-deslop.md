# Codebase Deslop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code, fix broken build/test artifacts, deduplicate test utilities, and clean up minor slop across the monorepo.

**Architecture:** No architectural changes. All changes are deletions, deduplication, or configuration fixes within the existing structure.

**Tech Stack:** TypeScript, Vitest, Node.js test runner, pnpm, Turbo

---

### Task 1: Fix packages/email Build/Test Mismatch

**Files:**

- Modify: `packages/email/src/package-surface.test.ts:47-52`
- Modify: `packages/email/src/consumer-contract.fixture.ts:51-55`

- [ ] **Step 1: Update surface test to include `sendWorkspaceInvitationEmail`**
      In `package-surface.test.ts`, add `"sendWorkspaceInvitationEmail"` to the expected method list (currently only 4 methods asserted, source has 5).

- [ ] **Step 2: Update consumer contract fixture**
      Add `sendWorkspaceInvitationEmail` and `sendSignupVerificationOtpEmail` calls to the fixture's `Promise.all` to verify the full type surface.

- [ ] **Step 3: Rebuild packages/email**
      Run `pnpm --filter @workspace/email build` to regenerate `dist/` with all 5 methods.

- [ ] **Step 4: Run tests to verify**
      Run `pnpm --filter @workspace/email test` -- all tests should pass.

- [ ] **Step 5: Commit**
      `fix(email): update surface test and rebuild dist to include workspace invitation method`

---

### Task 2: Remove Dead Code in apps/web

**Files:**

- Delete: `apps/web/src/lib/utils.ts`
- Delete: `apps/web/src/domains/identity/authentication/ui/home-session-card.tsx`
- Modify: `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx` (remove HomeSessionCard test block)
- Modify: `apps/web/package.json` (conditionally remove `clsx`/`tailwind-merge`, pin `nitro`)
- Modify: `apps/web/src/routes/__root.tsx:35` (fix page title to "tskr")

- [ ] **Step 1: Verify `cn` from `lib/utils.ts` has zero imports**
      Grep for imports of `@/lib/utils` or `../lib/utils` in `apps/web/src`. Confirm zero results.

- [ ] **Step 2: Delete `apps/web/src/lib/utils.ts`**

- [ ] **Step 3: Verify `home-session-card.tsx` has zero route/page imports**
      Grep for `home-session-card` imports. Confirm only `auth-pages.test.tsx` imports it.

- [ ] **Step 4: Delete `apps/web/src/domains/identity/authentication/ui/home-session-card.tsx`**

- [ ] **Step 5: Remove HomeSessionCard test block from `auth-pages.test.tsx`**
      Remove the import and the describe/test block that tests `HomeSessionCard`.

- [ ] **Step 6: Check if `clsx` and `tailwind-merge` are still needed in apps/web**
      Grep for `clsx` and `tailwind-merge` imports in `apps/web/src` after deleting `lib/utils.ts`. If zero results, remove both from `apps/web/package.json` dependencies.

- [ ] **Step 7: Fix page title**
      In `apps/web/src/routes/__root.tsx`, change `"TanStack Start Starter"` to `"tskr"`.

- [ ] **Step 8: Pin nitro version**
      In `apps/web/package.json`, replace `"nitro": "latest"` with the currently installed version. Check `node_modules/nitro/package.json` for the version and pin to `"^<that version>"`.

- [ ] **Step 9: Run tests**
      Run `pnpm --filter web test` -- verify all tests pass.

- [ ] **Step 10: Commit**
      `chore(web): remove dead utils and orphaned session card, fix title and pin nitro`

---

### Task 3: Clean Up packages/ui Minor Slop

**Files:**

- Delete: `packages/ui/src/components/cn.ts`
- Delete: `packages/ui/src/components/button-entry.ts`
- Modify: `packages/ui/src/components/button.tsx` (update import)
- Modify: `packages/ui/tsdown.config.ts` (point button entry at `button.tsx` directly)
- Delete: `packages/ui/src/lib/.gitkeep`
- Delete: `packages/ui/src/hooks/.gitkeep`
- Delete: `packages/ui/src/components/.gitkeep`

- [ ] **Step 1: Verify `cn.ts` consumers**
      Grep for imports of `./cn` in `packages/ui/src/components/`. Only `button.tsx` should import it.

- [ ] **Step 2: Update `button.tsx` import**
      Change import from `./cn` to `@/lib/utils` (matching every other component).

- [ ] **Step 3: Delete `packages/ui/src/components/cn.ts`**

- [ ] **Step 4: Verify `button-entry.ts` is redundant**
      Confirm `button.tsx` already has `"use client"` on line 1.

- [ ] **Step 5: Update `tsdown.config.ts`**
      Change the button entry from `src/components/button-entry.ts` to `src/components/button.tsx`.

- [ ] **Step 6: Delete `packages/ui/src/components/button-entry.ts`**

- [ ] **Step 7: Delete `.gitkeep` files**
      Delete `src/lib/.gitkeep`, `src/hooks/.gitkeep`, `src/components/.gitkeep`.

- [ ] **Step 8: Build and verify**
      Run `pnpm --filter @workspace/ui build` -- ensure build succeeds.

- [ ] **Step 9: Commit**
      `chore(ui): remove duplicate cn util, unnecessary button-entry wrapper, and gitkeep files`

---

### Task 4: Remove Dead Root Dependencies and Config

**Files:**

- Modify: `package.json` (remove `@biomejs/biome`)
- Delete: `.npmrc` (empty file)
- Modify: `packages/db/CLAUDE.md` (replace copy with symlink)

- [ ] **Step 1: Verify no biome usage**
      Grep for `biome` in all config/script files. Confirm zero results.

- [ ] **Step 2: Remove `@biomejs/biome` from root `package.json` devDependencies**

- [ ] **Step 3: Delete empty `.npmrc`**

- [ ] **Step 4: Fix `packages/db/CLAUDE.md`**
      Delete the file copy and create a symlink: `ln -s AGENTS.md CLAUDE.md` (run from packages/db directory)

- [ ] **Step 5: Run `pnpm install`**
      Verify the lockfile updates cleanly after removing biome.

- [ ] **Step 6: Commit**
      `chore: remove dead biome dependency, empty npmrc, and fix db CLAUDE.md symlink`

---

### Task 5: Deduplicate Test Utilities

#### 5a: apps/auth test helpers

**Files:**

- Create: `apps/auth/src/test-helpers.ts`
- Modify: `apps/auth/src/app.test.ts`
- Modify: `apps/auth/src/workspace-routes.test.ts`
- Modify: `apps/auth/src/domains/identity/authentication/infra/auth.test.ts`

- [ ] **Step 1: Create `apps/auth/src/test-helpers.ts`**
      Extract `requireValue<T>` (duplicated in all 3 test files).

- [ ] **Step 2: Update all 3 test files**
      Import `requireValue` from `./test-helpers` (or appropriate relative path). Remove the local definitions.

- [ ] **Step 3: Run tests**
      Run `pnpm --filter auth test` -- all tests pass.

- [ ] **Step 4: Commit**
      `chore(auth): extract shared requireValue test helper to reduce duplication`

#### 5b: apps/web test helpers

**Files:**

- Create: `apps/web/src/test-helpers.ts`
- Modify: `apps/web/src/domains/identity/authentication/infra/auth-service-client.test.ts`
- Modify: `apps/web/src/domains/workspaces/bootstrap/infra/workspace-bootstrap-client.test.ts`

- [ ] **Step 1: Create `apps/web/src/test-helpers.ts`**
      Extract the shared ~53-line block: `StartRequestStore` interface, `setCurrentStartRequest`, `clearCurrentStartRequest`, `withoutWindow` helpers.

- [ ] **Step 2: Update both test files**
      Import from the shared module, remove local definitions.

- [ ] **Step 3: Run tests**
      Run `pnpm --filter web test` -- all tests pass.

- [ ] **Step 4: Commit**
      `chore(web): extract shared StartRequestStore test helpers to reduce duplication`

#### 5c: packages/email test duplication

**Files:**

- Modify: `packages/email/src/email-service.test.ts`

- [ ] **Step 1: Remove duplicate console transport test**
      Remove the console transport test block (~lines 161-188) from `email-service.test.ts`. This is already covered by `console-transport.test.ts`.

- [ ] **Step 2: Run tests**
      Run `pnpm --filter @workspace/email test` -- all tests pass.

- [ ] **Step 3: Commit**
      `chore(email): remove duplicate console transport test covered by dedicated test file`

---

### Task 6: Extract Shared Script Utility

**Files:**

- Create: `scripts/lib/run-command.mjs`
- Modify: `scripts/lib/local-postgres.mjs`
- Modify: `scripts/lib/opensrc-sync.mjs`

- [ ] **Step 1: Create `scripts/lib/run-command.mjs`**
      Extract the shared `runCommand` pattern. Use the opensrc-sync version as the base (includes `Promise.race` with error event handling). Export a single `runCommand(command, args, options)` function.

- [ ] **Step 2: Update `local-postgres.mjs`**
      Import `runCommand` from `./run-command.mjs`, remove local implementation.

- [ ] **Step 3: Update `opensrc-sync.mjs`**
      Import `runCommand` from `./run-command.mjs`, remove local implementation. The DI `runner` parameter default becomes the shared function.

- [ ] **Step 4: Run script tests**
      Run `pnpm test:db-infra && pnpm test:opensrc` -- all tests pass.

- [ ] **Step 5: Commit**
      `chore(scripts): extract shared runCommand utility from duplicated implementations`
