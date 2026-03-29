# TSK-24 Settings/Admin Read-Write Contract Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the auth-owned settings/admin contract for account profile, workspace profile, members, roles, and invites, then wire that contract into a real web settings shell.

**Architecture:** Keep the backend contract owned by `apps/auth/src/domains/workspaces` and keep framework routes thin. Build the web consumer as a new settings/admin slice under the web identity domain, using `fetchAuthService` plus Zod-validated DTOs instead of duplicating business rules in the client. Treat the existing PRD and architecture decision as the approved design baseline for this plan.

**Tech Stack:** Hono, Better Auth organization plugin, TanStack Start, TanStack Router, TanStack Form, Zod, Vitest, pnpm, Ultracite

---

### Task 1: Lock The Auth-Owned Settings/Admin Contract

**Files:**

- Modify: `apps/auth/src/domains/workspaces/contracts.ts`
- Modify: `apps/auth/src/domains/workspaces/routes.ts`
- Modify: `apps/auth/src/domains/workspaces/workspace-service.ts`
- Modify: `apps/auth/src/workspace-routes.test.ts`
- Verify: `apps/auth/src/app.test.ts`

- [ ] **Step 1: Add failing auth contract tests first**
      Extend `apps/auth/src/workspace-routes.test.ts` to cover the full TSK-24 matrix:
      account profile read/write, workspace profile read/write, owner/admin invite creation and invite revocation rules, owner-only ownership mutations, dispatcher/field_worker rejection for workspace-admin endpoints, and the exact settings snapshot permissions expected by the web app.

- [ ] **Step 2: Make the DTO surface explicit in `contracts.ts`**
      Add or tighten exported request/response shapes for the settings/admin endpoints so the auth contract is named and stable, not just inferred from route handlers.

- [ ] **Step 3: Keep route parsing thin**
      Update `routes.ts` so each settings/admin endpoint delegates quickly into `workspace-service.ts` and uses consistent request validation/error messages for profile, invite, and role mutation payloads.

- [ ] **Step 4: Close any service-level gaps exposed by the tests**
      In `workspace-service.ts`, keep all authorization and ownership rules in one place. Preserve the Better Auth organization/member/invitation model as the system of record and do not add parallel app-owned membership state.

- [ ] **Step 5: Verify the auth contract**
      Run `pnpm --filter auth test`
      Expected: auth Vitest suite passes, including the expanded workspace route coverage.

- [ ] **Step 6: Commit**
      `feat(auth): lock settings admin contract for profiles members roles and invites`

---

### Task 2: Add Web Contract Schemas And Auth Clients

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/contracts/settings-admin-contract.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/get-settings-snapshot.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/update-account-profile.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/update-workspace-profile.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/create-workspace-invite.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/resend-workspace-invite.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/revoke-workspace-invite.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/update-workspace-member-role.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/remove-workspace-member.ts`
- Create: `apps/web/src/domains/identity/settings-admin/infra/settings-admin-client.test.ts`

- [ ] **Step 1: Define the web-facing contract schemas**
      Create Zod schemas and exported TypeScript types for the settings snapshot plus each mutation payload/response. Reuse the same role vocabulary as auth: `owner`, `admin`, `dispatcher`, `field_worker`.

- [ ] **Step 2: Add one fetch client per contract action**
      Build small client helpers on top of `fetchAuthService`, following the existing onboarding/bootstrap client pattern: send JSON, parse JSON, validate with Zod, and surface backend `message` errors when present.

- [ ] **Step 3: Keep workspace scoping explicit**
      Every workspace-admin client should take `workspaceId` explicitly. Do not hide workspace selection in module globals or client-only heuristics.

- [ ] **Step 4: Add failing client tests**
      Cover success, malformed JSON, schema-invalid payloads, and auth-service error message propagation in `settings-admin-client.test.ts`.

- [ ] **Step 5: Verify the web client layer**
      Run `pnpm --filter web test -- --runInBand`
      Expected: the new client tests pass alongside existing web tests.

- [ ] **Step 6: Commit**
      `feat(web): add settings admin auth clients and schemas`

---

### Task 3: Add The `/app/settings` Shell And Navigation

**Files:**

- Modify: `apps/web/src/domains/workspaces/app-shell/ui/authenticated-app-shell.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-layout.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-overview-page.tsx`
- Create: `apps/web/src/routes/app/settings.tsx`
- Create: `apps/web/src/routes/app/settings/index.tsx`
- Create: `apps/web/src/routes/app/settings/account.tsx`
- Create: `apps/web/src/routes/app/settings/workspace.tsx`
- Create: `apps/web/src/routes/app/settings/people.tsx`
- Create: `apps/web/src/routes/app/settings/labels.tsx`
- Create: `apps/web/src/routes/app/settings/service-zones.tsx`
- Create: `apps/web/src/routes/app/settings/notifications.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`

- [ ] **Step 1: Add a settings entry to the authenticated app shell**
      Update the sidebar/breadcrumb surface in `authenticated-app-shell.tsx` so `/app/settings` becomes a first-class destination instead of placeholder copy on the home page.

- [ ] **Step 2: Create a settings layout loader**
      In `apps/web/src/routes/app/settings.tsx`, load the active workspace from the existing bootstrap provider and fetch the settings snapshot for that workspace. Redirect to `/onboarding` if there is no active workspace.

- [ ] **Step 3: Split the shell into real and stub sections**
      Add nested routes for:
      `account`
      `workspace`
      `people`
      `labels`
      `service-zones`
      `notifications`
      Keep `labels`, `service-zones`, and `notifications` as stub pages that consume the new layout but do not invent backend scope beyond TSK-24.

- [ ] **Step 4: Encode access boundaries in the route UX**
      Make account settings available to any authenticated user with a workspace session. Keep workspace-admin pages (`workspace`, `people`) restricted to owner/admin behavior, using the auth snapshot permissions as the source of truth.

- [ ] **Step 5: Add route-level tests**
      Expand `app-shell-routes.test.tsx` to cover settings navigation, the settings shell loader, and the expected fallback behavior when workspace selection or permissions do not allow an admin view.

- [ ] **Step 6: Commit**
      `feat(web): add settings shell routes and navigation`

---

### Task 4: Implement Account And Workspace Profile Forms

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/ui/account-profile-form.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/workspace-profile-form.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/account-settings-page.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/workspace-settings-page.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-profile-forms.test.tsx`

- [ ] **Step 1: Write failing UI tests**
      Cover initial field hydration from the loaded snapshot, submit success, auth error display, and disabled states during submission.

- [ ] **Step 2: Build the account profile form**
      Use TanStack Form plus shared form primitives from `@workspace/ui/components/form`. Support editing `name` and avatar/image URL, and keep the contract scoped to the auth-owned account profile endpoint.

- [ ] **Step 3: Build the workspace profile form**
      Support editing workspace `name` and `logo`, and render the workspace `slug` as read-only context so the user can see the durable identifier without trying to edit it here.

- [ ] **Step 4: Refresh route data after successful saves**
      After profile mutations succeed, re-read the settings snapshot so the forms and layout stay aligned with auth-owned state instead of relying on local optimistic copies.

- [ ] **Step 5: Verify profile form behavior**
      Run `pnpm --filter web test`
      Expected: the new form tests pass and the existing onboarding/app-shell tests stay green.

- [ ] **Step 6: Commit**
      `feat(web): add account and workspace profile settings forms`

---

### Task 5: Implement Members, Roles, And Invites Management

**Files:**

- Create: `apps/web/src/domains/identity/settings-admin/ui/invite-member-form.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/workspace-members-table.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/workspace-invites-table.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/people-settings-page.tsx`
- Create: `apps/web/src/domains/identity/settings-admin/ui/settings-people-page.test.tsx`

- [ ] **Step 1: Write the failing people-page tests**
      Cover the owner/admin happy path plus the key constraints from TSK-24:
      owners can manage owner/admin/member roles,
      admins cannot create or mutate ownership,
      dispatcher/field_worker never get workspace-admin actions,
      self-leave and last-owner edge cases surface the backend error cleanly.

- [ ] **Step 2: Implement invite issuance UI**
      Build an invite form that only offers roles listed in `permissions.canInviteRoles`, posts through the new invite client, and refreshes the snapshot after success.

- [ ] **Step 3: Implement the members table**
      Render members from the snapshot, using each row’s `permissions.assignableRoles`, `canChangeRole`, and `canRemove` flags to decide which controls to show. Do not recompute authorization rules in the browser.

- [ ] **Step 4: Implement the pending invites table**
      Render invite rows with resend/revoke actions gated entirely by `pendingInvites[*].permissions`.

- [ ] **Step 5: Verify the people management flows**
      Run `pnpm --filter web test`
      Expected: the people-page tests pass and all route/client tests remain green.

- [ ] **Step 6: Commit**
      `feat(web): add member role and invite management settings page`

---

### Task 6: Final Verification And Cleanup

**Files:**

- Modify: any touched files from Tasks 1-5

- [ ] **Step 1: Run the auth suite one more time**
      Run `pnpm --filter auth test`
      Expected: auth contract and permission tests stay green.

- [ ] **Step 2: Run the web suite one more time**
      Run `pnpm --filter web test`
      Expected: settings shell, form, and people-management tests stay green.

- [ ] **Step 3: Run repo formatting and lint fixes**
      Run `pnpm exec ultracite fix`
      Expected: formatting/lint fixes apply cleanly with no unexpected churn.

- [ ] **Step 4: Re-run the touched package tests if Ultracite changed files**
      Run `pnpm --filter auth test && pnpm --filter web test`
      Expected: still green after formatting.

- [ ] **Step 5: Commit**
      `feat: deliver the TSK-24 settings admin contract and web shell`
