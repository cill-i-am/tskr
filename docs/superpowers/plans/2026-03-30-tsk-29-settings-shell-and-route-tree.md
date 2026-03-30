# TSK-29 Ship The Settings Shell And Settings Route Tree With Stub Sections Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` when delegation is available and explicitly authorized by the user; otherwise use `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one stable authenticated settings entrypoint with a reusable shell, clear account versus workspace sections, and explicit stub routes for labels, service zones, and notification settings.

**Architecture:** Keep route files in `apps/web/src/routes/app/settings*` thin and let the `identity/settings-admin` slice own the shell, access rules, and page UI. Reuse one loader/access layer for workspace-aware permissions so account settings remain reachable for non-admin members while workspace-only pages and stubs stay guarded behind admin-aware route logic.

**Tech Stack:** TanStack Start, TanStack Router file routes, React, TypeScript, Vitest, `@workspace/ui`, pnpm, Ultracite

---

## Chunk 1: Lock The Route Tree And Access Rules

### Task 1: Add Route-Level Coverage For The Settings Entry Tree

**Files:**

- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`
- Verify: `apps/web/src/routes/app.tsx`
- Verify: `apps/web/src/routes/app/settings.tsx`
- Verify: `apps/web/src/routes/app/settings/index.tsx`
- Verify: `apps/web/src/routes/app/settings/account.tsx`
- Verify: `apps/web/src/routes/app/settings/workspace.tsx`
- Verify: `apps/web/src/routes/app/settings/people.tsx`
- Verify: `apps/web/src/routes/app/settings/labels.tsx`
- Verify: `apps/web/src/routes/app/settings/service-zones.tsx`
- Verify: `apps/web/src/routes/app/settings/notifications.tsx`

- [ ] **Step 1: Add the failing route-tree tests first**
      Extend `app-shell-routes.test.tsx` to cover the full TSK-29 navigation contract:
      `/app` exposes a Settings destination,
      `/app/settings` loads the shell for admins,
      `/app/settings/account` stays available to non-admin members,
      `/app/settings/people` redirects non-admin members back to account settings,
      and the stub routes render explicit placeholder headings instead of 404ing.

- [ ] **Step 2: Keep the route files thin**
      Build or verify the file-route tree under `apps/web/src/routes/app/settings*` so each route only does loader selection and page composition.
      Do not put permission rules or UI branching directly into the file-route bodies beyond lightweight redirect behavior.

- [ ] **Step 3: Reconfirm the authenticated-shell entrypoint**
      Verify `apps/web/src/routes/app.tsx` still owns the authenticated app frame and exposes a stable path into `/app/settings` without coupling settings logic back into unrelated home-route concerns.

- [ ] **Step 4: Verify the route suite**
      Run: `pnpm --filter web test -- app-shell-routes`
      Expected: settings entry, redirects, and stub-route coverage all pass.

- [ ] **Step 5: Commit**
      `feat(web): add settings route tree coverage`

---

## Chunk 2: Build The Reusable Settings Shell

### Task 2: Create The Shared Layout, Overview, And Stub Definitions

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-layout.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-overview-page.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-stub-pages.tsx`
- Verify: `apps/web/src/domains/identity/authentication/ui/auth-page-shell.tsx`
- Verify: `apps/web/src/domains/workspaces/app-shell/ui/authenticated-app-shell.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`

- [ ] **Step 1: Add failing shell assertions before implementation**
      Extend the route test so `/app/settings` proves:
      the page renders one Settings shell,
      account settings are grouped separately from workspace settings,
      real admin destinations are distinct from “coming soon” destinations,
      and labels, service zones, and notifications appear in the shell navigation.

- [ ] **Step 2: Define stub metadata once**
      In `settings-stub-pages.tsx`, create one typed source of truth for the stub sections, including:
      title,
      route target,
      navigation description,
      overview description,
      and placeholder body copy.
      Reuse this metadata in both the sidebar navigation and the overview page so later slices can swap stubs for real pages without duplicating labels.

- [ ] **Step 3: Build the reusable shell**
      In `settings-layout.tsx`, render a two-column settings frame that:
      always exposes the account section,
      shows workspace-admin sections only when snapshot permissions allow them,
      separates “Available now” from “Coming soon,”
      and derives workspace summary text from shared bootstrap state rather than ad hoc route-level props.
      Prefer `@workspace/ui` card primitives for consistency with the rest of the app shell.

- [ ] **Step 4: Add the overview page**
      In `settings-overview-page.tsx`, render card-style entrypoints for:
      Account,
      any real workspace-admin pages the viewer can access,
      and the stub sections.
      Keep this as a navigation overview, not a second copy of the real forms.

- [ ] **Step 5: Verify the shell behavior**
      Run: `pnpm --filter web test -- app-shell-routes`
      Expected: the settings shell and overview assertions pass with the new grouped navigation.

- [ ] **Step 6: Commit**
      `feat(web): add reusable settings shell`

---

## Chunk 3: Add The Settings Access Layer And Real Page Routes

### Task 3: Centralize Permission-Aware Loading For The Settings Slice

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/application/settings-route-access.ts`
- Verify: `apps/web/src/domains/workspaces/bootstrap/application/resolve-workspace-entry.ts`
- Verify: `apps/web/src/domains/workspaces/bootstrap/infra/workspace-bootstrap-client.ts`
- Verify: `apps/web/src/domains/identity/settings-admin/infra/get-settings-snapshot.ts`
- Modify: `apps/web/src/routes/app/settings.tsx`
- Modify: `apps/web/src/routes/app/settings/index.tsx`
- Modify: `apps/web/src/routes/app/settings/account.tsx`
- Modify: `apps/web/src/routes/app/settings/workspace.tsx`
- Modify: `apps/web/src/routes/app/settings/people.tsx`
- Modify: `apps/web/src/routes/app/settings/labels.tsx`
- Modify: `apps/web/src/routes/app/settings/service-zones.tsx`
- Modify: `apps/web/src/routes/app/settings/notifications.tsx`

- [ ] **Step 1: Add failing redirect and loader expectations**
      Expand the route-level tests so they lock:
      redirect to `/login` when auth is missing,
      redirect to `/onboarding` when no active workspace exists,
      redirect to `/app/settings/account` when a member lacks workspace-admin access,
      and successful snapshot loading for owners or admins visiting workspace settings.

- [ ] **Step 2: Create the access helpers**
      In `settings-route-access.ts`, add focused helpers for:
      resolving authenticated workspace access,
      loading the settings snapshot when the active role can request it,
      detecting “people settings” access separately from “workspace profile” access,
      and converting forbidden snapshot responses into `null` so the shell can gracefully fall back to account-only navigation.

- [ ] **Step 3: Wire the route loaders**
      Update the settings route files so:
      `/app/settings` loads the shell and redirects account-only viewers to `/app/settings/account`,
      `/app/settings/account` can reuse parent loader data,
      `/app/settings/workspace` requires profile-edit access,
      `/app/settings/people` redirects client-side when snapshot permissions block people management,
      and the stub routes require workspace-admin access before rendering placeholders.

- [ ] **Step 4: Keep snapshot ownership in the settings slice**
      Reuse `get-settings-snapshot.ts` as the only client fetch for workspace-admin settings data.
      Do not create parallel per-route fetches for members, invites, or workspace profile details.

- [ ] **Step 5: Verify the route and access layer**
      Run: `pnpm --filter web test -- app-shell-routes`
      Expected: redirects, guarded routes, and snapshot-loading behavior all pass together.

- [ ] **Step 6: Commit**
      `feat(web): wire settings access loaders`

---

## Chunk 4: Plug In The Real Pages And Stub Surfaces

### Task 4: Mount Account, Workspace, People, And Placeholder Pages Into The Shell

**Files:**

- Verify: `apps/web/src/domains/identity/settings-admin/ui/account-settings-page.tsx`
- Verify: `apps/web/src/domains/identity/settings-admin/ui/workspace-settings-page.tsx`
- Verify: `apps/web/src/domains/identity/settings-admin/ui/people-settings-page.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/settings-people-page.test.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/settings-profile-forms.test.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`

- [ ] **Step 1: Lock the real-page expectations**
      Extend the existing settings UI tests so they continue to prove:
      account settings render inside the new shell,
      workspace settings render for authorized users,
      people settings expose invite/member management for admins,
      and the stub pages render placeholder copy rather than empty containers.

- [ ] **Step 2: Reuse the existing page components**
      Mount `AccountSettingsPage`, `WorkspaceSettingsPage`, and `PeopleSettingsPage` through the new route tree instead of rebuilding those forms inside the shell.
      This keeps TSK-29 focused on information architecture and navigation rather than duplicating profile or membership-management behavior.

- [ ] **Step 3: Verify stub-page UX**
      Make the placeholder pages explicit enough that future slices can replace them safely:
      clear heading,
      short description of what belongs there,
      and copy that signals the page is intentionally scaffolded, not broken.

- [ ] **Step 4: Run the focused settings UI tests**
      Run: `pnpm --filter web test -- settings-profile-forms settings-people-page`
      Expected: existing profile/member-management flows still pass inside the new shell structure.

- [ ] **Step 5: Commit**
      `feat(web): plug settings pages into shell`

---

## Chunk 5: Final Verification And Branch Reconciliation

### Task 5: Confirm TSK-29 Is Shippable And Reconcile Any Existing Local Implementation

**Files:**

- Modify: any touched files from Tasks 1-4
- Verify: `docs/superpowers/specs/2026-03-24-workspace-membership-and-settings-prd.md`

- [ ] **Step 1: Run the full web test suite for the slice**
      Run: `pnpm --filter web test`
      Expected: route, settings, onboarding, and workspace bootstrap suites remain green together.

- [ ] **Step 2: Run the required repo-wide fix pass**
      Run: `pnpm exec ultracite fix`
      Expected: lint and formatting fixes apply cleanly from the repo root.

- [ ] **Step 3: Re-run the touched web tests after formatting**
      Run: `pnpm --filter web test -- app-shell-routes settings-profile-forms settings-people-page`
      Expected: still green after the Ultracite pass.

- [ ] **Step 4: Compare the final diff against TSK-29 scope**
      Sanity-check the branch against the Linear issue and PRD.
      Expected: the work stays limited to the settings shell, route tree, clear account-versus-workspace IA, and explicit stubs for labels, service zones, and notifications.

- [ ] **Step 5: Reconcile current branch state before publishing**
      If the working tree already contains some or all of this implementation, verify whether TSK-29 is effectively done already.
      If it is, reduce follow-up work to missing tests, polish, or cleanup instead of re-implementing the shell.

- [ ] **Step 6: Commit**
      `feat: ship the settings shell and settings route tree with stub sections`

---

## Current Repo Snapshot

- The current `apps/web` tree already contains a candidate implementation of the TSK-29 route tree and settings shell in `apps/web/src/routes/app/settings*` and `apps/web/src/domains/identity/settings-admin/ui/*`.
- The route-level coverage in `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx` already exercises most of the issue acceptance criteria.
- Before starting fresh implementation work, compare the target branch against this local state so the task becomes “finish or verify TSK-29” instead of accidentally duplicating completed work.
