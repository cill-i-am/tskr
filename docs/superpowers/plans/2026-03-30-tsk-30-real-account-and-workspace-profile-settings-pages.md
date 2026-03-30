# TSK-30 Ship The Real Account And Workspace Profile Settings Pages Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` when delegation is available and explicitly authorized by the user; otherwise use `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship real account and workspace profile settings pages so every authenticated member can edit their own basic profile, workspace owners/admins can edit workspace identity, and both pages present avatar/logo identity with initials fallback.

**Architecture:** Keep the settings route tree and shell from TSK-29 intact, but stop treating account profile data as part of the admin-only workspace settings snapshot. The account page should load its own auth-owned profile data for any authenticated member, while workspace profile editing should stay in the `identity/settings-admin` slice and continue using the workspace-admin snapshot plus explicit workspace-profile mutations.

**Tech Stack:** TanStack Start, TanStack Router file routes, React, TypeScript, TanStack Form, Vitest, `@workspace/ui`, pnpm, Ultracite

---

## Chunk 1: Make Account Settings Real For Every Member

### Task 1: Split Account Profile Loading From The Admin Snapshot

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/infra/get-account-profile.ts`
- Modify: `apps/web/src/domains/identity/settings-admin/infra/settings-admin-client.test.ts`
- Modify: `apps/web/src/domains/identity/settings-admin/application/settings-route-access.ts`
- Modify: `apps/web/src/routes/app/settings/account.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/account-settings-page.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`
- Verify: `apps/auth/src/domains/workspaces/routes.ts`
- Verify: `apps/auth/src/domains/workspaces/workspace-service.ts`

- [ ] **Step 1: Add the failing web tests first**
      Extend `settings-admin-client.test.ts` with a focused `getAccountProfile` client test that expects `GET /api/account/profile` to parse through `settingsAdminAccountProfileSchema`.
      Extend `app-shell-routes.test.tsx` so a non-admin member visiting `/app/settings/account` still gets the real account page instead of the current fallback-only copy, and so the route does not depend on `getSettingsSnapshot` succeeding for that path.

- [ ] **Step 2: Add the dedicated account-profile client**
      Create `get-account-profile.ts` beside the existing settings-admin infra clients.
      Reuse `fetchAuthService`, `settingsAdminAccountProfileSchema`, and `readAuthServiceErrorMessage`.
      Match the error-handling style already used in `get-settings-snapshot.ts` and `update-account-profile.ts` so malformed JSON, schema-invalid payloads, and API error messages behave consistently.

- [ ] **Step 3: Add a focused loader path for the account route**
      Update `settings-route-access.ts` so the account page can:
      require authenticated workspace access,
      keep the parent `/app/settings` shell behavior,
      and separately fetch the auth-owned account profile for any authenticated member.
      Do not broaden the admin snapshot endpoint to regular members just to hydrate the account form.

- [ ] **Step 4: Refactor the account page to consume real account data**
      Change `account-settings-page.tsx` to accept the loaded account profile directly rather than relying on `snapshot?.accountProfile`.
      Keep the page copy grounded in the active workspace from shared bootstrap state, but remove the current placeholder branch that leaves members without an editable form.

- [ ] **Step 5: Verify the account-loading path**
      Run: `pnpm --filter web test -- app-shell-routes settings-admin-client`
      Expected: member account settings stay reachable, the new account-profile client is covered, and no admin-only snapshot fetch is required for the member account page.

- [ ] **Step 6: Commit**
      `feat(web): load real account settings for members`

---

## Chunk 2: Add Identity Preview UI With Initials Fallback

### Task 2: Show Account And Workspace Identity Instead Of Bare URL Fields

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-identity-preview.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/account-settings-page.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/workspace-settings-page.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/account-profile-form.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/workspace-profile-form.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/settings-profile-forms.test.tsx`
- Verify: `packages/ui/src/components/avatar.tsx`
- Verify: `apps/web/src/domains/workspaces/active-workspace/ui/workspace-access-panel.tsx`

- [ ] **Step 1: Lock the avatar/logo UX in tests before implementation**
      Extend `settings-profile-forms.test.tsx` so both pages prove:
      the current account/workspace identity is visibly presented,
      the preview uses the image/logo when a URL exists,
      and initials render when the URL is blank or `null`.
      Cover the exact fallback text that should appear for a person versus a workspace instead of relying on invisible implementation details.

- [ ] **Step 2: Add one local preview component for the settings slice**
      Create `settings-identity-preview.tsx` as a small `identity/settings-admin` UI primitive built on `@workspace/ui/components/avatar`.
      Keep the initials helper local to this slice unless a second consumer inside the task truly needs extraction.
      The component should accept:
      display name,
      optional image/logo URL,
      fallback label,
      and supporting copy for the surrounding page.

- [ ] **Step 3: Wire the preview into the account page**
      Update `account-settings-page.tsx` and `account-profile-form.tsx` so the page shows:
      the user’s current display name,
      their email context,
      and avatar fallback initials when no image URL exists.
      Keep the URL field as lightweight configuration, but make the visible identity preview the primary feedback surface.

- [ ] **Step 4: Wire the preview into the workspace page**
      Update `workspace-settings-page.tsx` and `workspace-profile-form.tsx` so the workspace page shows:
      the current workspace name,
      the slug as read-only context,
      and logo fallback initials when no logo exists.
      Keep deeper branding controls out of scope; this should remain a lightweight profile identity editor.

- [ ] **Step 5: Verify the profile-page UI coverage**
      Run: `pnpm --filter web test -- settings-profile-forms`
      Expected: account/workspace profile tests now cover preview rendering, initials fallback, submit success, and submit error states together.

- [ ] **Step 6: Commit**
      `feat(web): add settings identity previews`

---

## Chunk 3: Cover Validation And Route-Level Happy Paths

### Task 3: Close The Test Gaps Called Out By TSK-30

**Files:**

- Modify: `apps/web/src/domains/identity/settings-admin/ui/settings-profile-forms.test.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/account-profile-form.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/workspace-profile-form.tsx`
- Verify: `apps/web/src/domains/identity/settings-admin/contracts/settings-admin-contract.ts`

- [ ] **Step 1: Add failing validation tests**
      Extend `settings-profile-forms.test.tsx` with explicit user-visible validation coverage for both profile forms:
      blank account name shows `Name is required.`,
      blank workspace name shows `Workspace name is required.`,
      and the submit mutation is not called when validation fails.

- [ ] **Step 2: Add route-level happy-path assertions**
      Extend `app-shell-routes.test.tsx` so:
      `/app/settings/account` shows the real editable account page for a member,
      `/app/settings/workspace` still shows the editable workspace page for owner/admin viewers,
      and the settings shell navigation still renders the expected destinations without regressing TSK-29 behavior.

- [ ] **Step 3: Tighten the form presentation around validation feedback**
      Update `account-profile-form.tsx` and `workspace-profile-form.tsx` only as much as needed so field-level validation is obvious and stable in tests.
      Keep the existing TanStack Form pattern intact; do not introduce a second form abstraction just for these two pages.

- [ ] **Step 4: Re-run the focused slice tests**
      Run: `pnpm --filter web test -- app-shell-routes settings-profile-forms`
      Expected: route-level happy paths, permissions, validation, preview fallback, submit success, and submit failure all pass together.

- [ ] **Step 5: Commit**
      `test(web): cover settings profile validation and routes`

---

## Chunk 4: Final Verification And Scope Check

### Task 4: Confirm TSK-30 Ships Only The Profile Slice

**Files:**

- Modify: any touched files from Tasks 1-3
- Verify: `docs/superpowers/specs/2026-03-24-workspace-membership-and-settings-prd.md`
- Verify: `docs/superpowers/plans/2026-03-30-tsk-29-settings-shell-and-route-tree.md`

- [ ] **Step 1: Run the relevant web test suites together**
      Run: `pnpm --filter web test -- app-shell-routes settings-admin-client settings-profile-forms`
      Expected: the full settings route/data/form slice is green as one unit.

- [ ] **Step 2: Run the auth workspace route tests only if backend behavior changed**
      Run: `pnpm --filter auth test -- workspace-routes`
      Expected: only required if you touched `apps/auth`; otherwise skip and note that the existing auth route coverage already backs the profile endpoints.

- [ ] **Step 3: Run the required repo-wide fix pass**
      Run: `pnpm exec ultracite fix`
      Expected: lint and formatting fixes apply cleanly from the repo root.

- [ ] **Step 4: Re-run the touched tests after Ultracite**
      Run: `pnpm --filter web test -- app-shell-routes settings-admin-client settings-profile-forms`
      Expected: still green after formatting and lint fixes.

- [ ] **Step 5: Compare the final diff against TSK-30 scope**
      Sanity-check the branch against the Linear issue and PRD.
      Expected: the work is limited to real account/workspace profile pages, member-safe account editing, avatar/logo preview with initials fallback, and page-level happy-path plus validation/error coverage.

- [ ] **Step 6: Commit**
      `feat: ship the real account and workspace profile settings pages`

---

## Current Repo Snapshot

- `apps/auth` already exposes and tests `GET/PATCH /api/account/profile` and `PATCH /api/workspaces/:workspaceId/profile`, so TSK-30 does not need to invent new backend endpoints unless implementation uncovers a concrete contract gap.
- `apps/web/src/domains/identity/settings-admin/ui/account-profile-form.tsx` and `apps/web/src/domains/identity/settings-admin/ui/workspace-profile-form.tsx` already contain most of the mutation wiring, success handling, and API error handling.
- The main missing behavior is on the web side:
  the account page currently depends on the admin-only settings snapshot,
  non-admin members therefore do not get a real editable account page,
  and the profile pages do not yet visibly present avatar/logo identity with initials fallback.
- Existing tests already cover submit success, service-error rendering, and in-flight disabled states, so the plan should add only the missing member-access, validation, and identity-preview coverage instead of rewriting the whole slice.

Plan complete and saved to `docs/superpowers/plans/2026-03-30-tsk-30-real-account-and-workspace-profile-settings-pages.md`. Ready to execute?
