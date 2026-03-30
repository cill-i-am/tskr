# TSK-31 Ship The Users, Roles, And Invite-Management Settings Page Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` when delegation is available and explicitly authorized by the user; otherwise use `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the real workspace membership settings page by exposing the remaining day-one admin UX that already exists in the auth contract, especially invite sharing details and clearer self-leave or ownership-protection guidance.

**Architecture:** Keep the auth-owned workspace contract unchanged unless implementation uncovers a real mismatch, because the current `apps/auth` and `apps/web` tests already prove the membership, invite, role-change, and permission rules. Treat this ticket as a web-slice completion pass inside `apps/web/src/domains/identity/settings-admin/ui`, using the existing settings snapshot as the only source of truth for invite codes, accept URLs, role controls, and leave protections.

**Tech Stack:** TanStack Start, TanStack Router, React, TypeScript, Vitest, `@workspace/ui`, pnpm, Ultracite

---

## Chunk 1: Lock The Missing Users-And-Roles UX In Tests

### Task 1: Add failing page-level coverage for the remaining TSK-31 gaps

**Files:**

- Modify: `apps/web/src/domains/identity/settings-admin/ui/settings-people-page.test.tsx`
- Verify: `apps/web/src/domains/identity/settings-admin/contracts/settings-admin-contract.ts`
- Verify: `apps/auth/src/domains/workspaces/workspace-service.ts`

- [ ] **Step 1: Add a failing test for the real page heading and summary copy**
      Extend `settings-people-page.test.tsx` so the page proves it is no longer presenting “next task” placeholder language.
      Assert visible copy that matches the shipped surface: members, roles, pending invites, and admin actions all live on one settings page.

- [ ] **Step 2: Add a failing test for invite sharing details**
      Lock the existing contract into the UI by asserting each pending invite row exposes the short invite code and the signed accept link from `SettingsAdminWorkspaceInvite`.
      Do not add new backend fields; the snapshot already carries `code` and `acceptUrl`.

- [ ] **Step 3: Add a failing test for clear self-leave guidance**
      Cover the current-user row for a removable member so the page explains that leaving removes workspace access immediately.
      Keep this as page copy, not a silent implication from the button label alone.

- [ ] **Step 4: Add a failing test for last-owner protection messaging**
      Cover the owner case where the current viewer cannot leave because they are the final owner.
      Assert visible copy such as “add or transfer another owner before leaving” so the UI is understandable before the backend error path is triggered.

- [ ] **Step 5: Verify the tests fail for the intended reasons**
      Run: `pnpm --filter web test -- settings-people-page`
      Expected: failures should point to missing copy or missing invite-detail rendering, not to unrelated route/bootstrap regressions.

- [ ] **Step 6: Commit**
      `test(web): lock remaining users and invites page expectations`

---

## Chunk 2: Ship The Remaining Page UX

### Task 2: Replace stale placeholder copy with real membership-management guidance

**Files:**

- Modify: `apps/web/src/domains/identity/settings-admin/ui/people-settings-page.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/workspace-members-table.tsx`
- Verify: `apps/web/src/routes/app/settings/people.tsx`

- [ ] **Step 1: Remove the stale “next task” copy**
      Replace the current `sr-only` placeholder text in `people-settings-page.tsx` with real descriptive copy that matches the shipped page.
      The header should explain that this page is the workspace home for members, roles, invites, and leave actions.

- [ ] **Step 2: Add explicit leave guidance for the current user**
      In `workspace-members-table.tsx`, add a visible row-level or section-level note for the current viewer when `canRemove` is true.
      The note should clarify that “Leave workspace” removes their own access from the current workspace immediately.

- [ ] **Step 3: Add explicit last-owner protection guidance**
      When the current viewer is an owner and cannot remove themselves, render clear explanatory copy instead of only omitting the action.
      Derive this from the existing member row data already returned by the snapshot; do not introduce a second permissions model in the client.

- [ ] **Step 4: Keep authorization decisions backend-owned**
      Use the existing `permissions.canRemove`, `permissions.canChangeRole`, `assignableRoles`, and member roles to decide which explanatory copy appears.
      Do not recompute owner/admin policy in the browser beyond user-facing messaging.

- [ ] **Step 5: Re-run the focused page suite**
      Run: `pnpm --filter web test -- settings-people-page`
      Expected: the page tests now pass with the clearer shipped copy and leave-protection guidance.

- [ ] **Step 6: Commit**
      `feat(web): clarify people settings leave and ownership guidance`

### Task 3: Surface invite codes and accept links from the existing snapshot

**Files:**

- Modify: `apps/web/src/domains/identity/settings-admin/ui/workspace-invites-table.tsx`
- Modify: `apps/web/src/domains/identity/settings-admin/ui/settings-people-page.test.tsx`
- Verify: `apps/web/src/domains/identity/settings-admin/contracts/settings-admin-contract.ts`

- [ ] **Step 1: Render invite details in each pending row**
      Update `workspace-invites-table.tsx` so each invite row shows:
      the invite email,
      role,
      status,
      short code,
      and signed accept URL.
      Keep the table readable on smaller widths by stacking secondary details inside the email/details cell instead of expanding the column count aggressively.

- [ ] **Step 2: Add copy affordances for day-one manual sharing**
      Add lightweight copy actions for the invite code and accept link.
      Use slice-local UI state so a copied row can show temporary success feedback without affecting other pending invite rows.

- [ ] **Step 3: Keep resend and revoke behavior isolated**
      Make sure the new copy affordances do not interfere with the existing resend or revoke pending states already covered in `settings-people-page.test.tsx`.
      Copy actions should be independent from mutation pending sets.

- [ ] **Step 4: Handle clipboard fallback cleanly**
      If `navigator.clipboard` is unavailable or rejects, surface a concise page error through the existing `onError` plumbing instead of silently failing.

- [ ] **Step 5: Re-run the focused page suite**
      Run: `pnpm --filter web test -- settings-people-page`
      Expected: invite detail rendering, copy feedback, resend, revoke, role changes, self-leave, and backend-error coverage all pass together.

- [ ] **Step 6: Commit**
      `feat(web): expose invite codes and accept links in people settings`

---

## Chunk 3: Reconcile The Ticket Against The Existing Slice

### Task 4: Run the already-green cross-slice verification and final cleanup

**Files:**

- Modify: any touched files from Tasks 1-3
- Verify: `apps/auth/src/workspace-routes.test.ts`
- Verify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`
- Verify: `apps/web/src/domains/identity/settings-admin/infra/settings-admin-client.test.ts`
- Verify: `docs/superpowers/specs/2026-03-24-workspace-membership-and-settings-prd.md`

- [ ] **Step 1: Run the focused web settings suites together**
      Run: `pnpm --filter web test -- settings-people-page app-shell-routes settings-admin-client settings-profile-forms`
      Expected: the settings shell, people page, profile forms, and client contracts remain green as one feature slice.

- [ ] **Step 2: Re-run the auth workspace contract suite**
      Run: `pnpm --filter auth test -- workspace-routes`
      Expected: owner/admin invite rules, role mutations, self-leave, and last-owner protection still pass with no backend changes required.

- [ ] **Step 3: Run the required repo-wide fix pass**
      Run: `pnpm exec ultracite fix`
      Expected: formatting and lint fixes apply cleanly from the repo root with no surprising churn.

- [ ] **Step 4: Re-run the touched suites after Ultracite**
      Run: `pnpm --filter web test -- settings-people-page app-shell-routes settings-admin-client settings-profile-forms`
      Run: `pnpm --filter auth test -- workspace-routes`
      Expected: still green after the formatting and lint pass.

- [ ] **Step 5: Sanity-check the branch against TSK-31 scope**
      Confirm the final diff is limited to:
      clearer users-and-roles page copy,
      explicit leave and last-owner messaging,
      invite code and signed-link visibility,
      and the tests needed to keep those behaviors stable.
      Do not reopen broader auth-contract or route-tree work already covered by TSK-24, TSK-29, and TSK-30 unless a concrete regression is found.

- [ ] **Step 6: Commit**
      `feat: ship the users roles and invite management settings page`

---

## Current Repo Snapshot

- The underlying auth contract already exists and passed locally on 2026-03-30 with `pnpm --filter auth test -- workspace-routes`.
- The relevant web settings suites already pass locally on 2026-03-30 with `pnpm --filter web test -- settings-people-page app-shell-routes settings-admin-client settings-profile-forms`.
- `SettingsAdminWorkspaceInvite` already includes `code` and `acceptUrl`, but the current `workspace-invites-table.tsx` does not render either field.
- `people-settings-page.tsx` still contains stale “next task” placeholder copy even though the page is already functional.
- `workspace-members-table.tsx` currently relies on button presence or backend errors to communicate self-leave and last-owner constraints, which is weaker than the Linear acceptance criteria asking for understandable UI messaging.
- If this work is published as a PR, title it exactly `Ship the users, roles, and invite-management settings page` so Linear can link the PR back to `TSK-31`.

Plan complete and saved to `docs/superpowers/plans/2026-03-30-tsk-31-ship-the-users-roles-and-invite-management-settings-page.md`. Ready to execute?
