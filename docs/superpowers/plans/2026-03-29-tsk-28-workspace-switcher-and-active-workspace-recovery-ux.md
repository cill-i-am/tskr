# TSK-28 Workspace Switcher And Active-Workspace Recovery UX Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real workspace switcher in the authenticated app shell, show pending invites alongside memberships, and replace the current selection-recovery placeholder with a usable recovery flow that writes the active workspace back through the auth-owned session contract.

**Architecture:** Keep `apps/auth` as the owner of active-workspace session state and reuse `PUT /api/workspaces/active` as the only switch mutation path. Add a small web-side active-workspace slice that owns the switch client plus shared membership/invite presentation, then reuse that slice in both the authenticated shell and the onboarding recovery route so switching and recovery follow one UX contract instead of diverging copies.

**Tech Stack:** Hono, Better Auth organization plugin, TanStack Start, TanStack Router, TanStack Form patterns, Zod, Vitest, pnpm, Ultracite, `@workspace/ui`

---

## Chunk 1: Lock The Active-Workspace Contract

### Task 1: Verify The Auth Contract And Add A Web Switch Client

**Files:**

- Modify: `apps/auth/src/workspace-routes.test.ts`
- Verify: `apps/auth/src/domains/workspaces/routes.ts`
- Verify: `apps/auth/src/domains/workspaces/workspace-service.ts`
- Create: `apps/web/src/domains/workspaces/active-workspace/infra/update-active-workspace.ts`
- Create: `apps/web/src/domains/workspaces/active-workspace/infra/update-active-workspace.test.ts`

- [ ] **Step 1: Add the failing auth regression first**
      Extend `apps/auth/src/workspace-routes.test.ts` to cover the exact TSK-28 recovery handoff:
      when bootstrap is in `selection_required`,
      selecting one valid membership through `PUT /api/workspaces/active` returns a bootstrap with that workspace active,
      and non-members still receive `403`.
      This locks the server behavior the web recovery UI will rely on.

- [ ] **Step 2: Reconfirm the existing auth surface instead of inventing a new endpoint**
      Review `routes.ts` and `workspace-service.ts` while implementing the test.
      Only change auth code if the new regression proves a real gap.
      Do not add parallel client-owned active-workspace persistence.

- [ ] **Step 3: Build the web mutation client**
      In `update-active-workspace.ts`, add a focused helper on top of `fetchAuthService` that:
      sends `workspaceId` to `/api/workspaces/active`,
      validates the returned payload with `workspaceBootstrapSchema`,
      reuses existing auth-service error parsing,
      and keeps `null` support available for future explicit clearing behavior without exposing it in the current UI unless needed.

- [ ] **Step 4: Add failing client tests**
      In `update-active-workspace.test.ts`, cover:
      successful switching,
      surfaced backend error messages,
      malformed JSON,
      and schema-invalid bootstrap payloads.

- [ ] **Step 5: Verify the contract layer**
      Run: `pnpm --filter auth test -- workspace-routes`
      Expected: the auth route suite passes with the new selection-recovery coverage.

- [ ] **Step 6: Verify the web client layer**
      Run: `pnpm --filter web test -- update-active-workspace`
      Expected: the new client tests pass.

- [ ] **Step 7: Commit**
      `feat(workspaces): add active workspace switch client`

---

## Chunk 2: Add The Shared Workspace-Switching Surface

### Task 2: Build One Membership And Invite Surface For The App Shell

**Files:**

- Create: `apps/web/src/domains/workspaces/active-workspace/ui/workspace-access-panel.tsx`
- Create: `apps/web/src/domains/workspaces/active-workspace/ui/workspace-switcher.tsx`
- Create: `apps/web/src/domains/workspaces/active-workspace/ui/workspace-recovery-notice.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/authenticated-app-shell.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-home-page.tsx`
- Modify: `apps/web/src/domains/workspaces/app-shell/ui/app-shell-routes.test.tsx`

- [ ] **Step 1: Add failing route-level app-shell tests**
      Extend `app-shell-routes.test.tsx` to cover:
      opening the workspace switcher from the authenticated shell,
      listing all memberships with workspace logo, workspace name, and viewer role,
      showing pending invites in the same surface,
      switching to another workspace and landing on refreshed shell state,
      and rendering an understandable `auto_switched` explanation instead of opaque raw recovery text.

- [ ] **Step 2: Build the shared access panel first**
      In `workspace-access-panel.tsx`, render the reusable list content for:
      current membership entries,
      pending invite entries in a distinct section,
      a clear selected state for the active workspace,
      and avatar/logo fallback UI using `@workspace/ui` avatar primitives.
      Keep role labels user-facing and avoid re-deriving permissions in the browser.

- [ ] **Step 3: Wrap the panel in an app-shell switcher**
      In `workspace-switcher.tsx`, add the shell-specific trigger and mutation behavior.
      After a successful switch, use TanStack Router invalidation so `/app` reloads from auth-owned bootstrap state rather than mutating local context only.
      Disable the active workspace action while a switch is pending.

- [ ] **Step 4: Wire the switcher into the authenticated shell**
      Update `authenticated-app-shell.tsx` so the sidebar/header surface exposes the switcher as part of the authenticated app frame, replacing the current passive workspace summary with an intentional switching affordance.

- [ ] **Step 5: Explain auto-recovery in the home page**
      Update `app-shell-home-page.tsx` so `recoveryState === "auto_switched"` produces a human explanation of what happened and where the user landed, rather than dumping the raw enum.
      Keep the page lightweight; the shell is the primary control surface.

- [ ] **Step 6: Verify the shell behavior**
      Run: `pnpm --filter web test -- app-shell-routes`
      Expected: the app-shell route suite passes with switcher, invite, and auto-switch coverage.

- [ ] **Step 7: Commit**
      `feat(web): add workspace switcher to app shell`

---

## Chunk 3: Replace The Recovery Placeholder With Real Selection UX

### Task 3: Reuse The Same Surface In The Onboarding Recovery Route

**Files:**

- Create: `apps/web/src/domains/workspaces/active-workspace/ui/workspace-selection-recovery.tsx`
- Modify: `apps/web/src/domains/workspaces/onboarding/ui/workspace-onboarding-page.tsx`
- Modify: `apps/web/src/domains/workspaces/onboarding/ui/workspace-onboarding-page.test.tsx`
- Verify: `apps/web/src/routes/onboarding.tsx`
- Verify: `apps/web/src/domains/workspaces/bootstrap/application/resolve-workspace-entry.ts`

- [ ] **Step 1: Add failing onboarding recovery tests**
      Extend `workspace-onboarding-page.test.tsx` so `selection_required` users now see:
      a real selection heading,
      membership choices with role and workspace identity,
      pending invites in the same mental space,
      a working selection action,
      and no leftover “coming next” placeholder copy.

- [ ] **Step 2: Create a dedicated full-page recovery wrapper**
      In `workspace-selection-recovery.tsx`, reuse `workspace-access-panel.tsx` inside the onboarding layout, with copy tailored to:
      “your previous active workspace is no longer available”
      and “choose where to continue.”
      This wrapper should own the recovery-specific heading and empty-state explanation, not the shared list renderer.

- [ ] **Step 3: Swap out the onboarding placeholder**
      Update `workspace-onboarding-page.tsx` so the `selection_required` branch renders the new recovery component instead of the current placeholder card.
      Preserve the existing create-workspace onboarding path for `onboarding_required`.

- [ ] **Step 4: Keep route ownership unchanged**
      Reconfirm that `resolve-workspace-entry.ts` and `routes/onboarding.tsx` already send `selection_required` users into `/onboarding`.
      Do not move recovery logic into ad hoc client redirects; keep the route gate thin and let the page own the selection UX.

- [ ] **Step 5: Verify onboarding recovery**
      Run: `pnpm --filter web test -- workspace-onboarding-page`
      Expected: the onboarding page suite passes with the real recovery selection flow.

- [ ] **Step 6: Commit**
      `feat(web): add active workspace recovery selection page`

---

## Chunk 4: Final Verification And Cleanup

### Task 4: Verify The Full TSK-28 Slice

**Files:**

- Modify: any touched files from Tasks 1-3

- [ ] **Step 1: Run the focused auth regression again**
      Run: `pnpm --filter auth test -- workspace-routes`
      Expected: active-workspace selection and existing workspace route behavior stay green.

- [ ] **Step 2: Run the focused web suites together**
      Run: `pnpm --filter web test -- --runInBand`
      Expected: the active-workspace client, app-shell route, onboarding recovery, and existing workspace/join/settings tests all pass together.

- [ ] **Step 3: Run repo formatting and lint fixes**
      Run: `pnpm exec ultracite fix`
      Expected: formatting and lint fixes apply cleanly with no unwanted structural churn.

- [ ] **Step 4: Re-run the touched package tests after Ultracite**
      Run: `pnpm --filter auth test && pnpm --filter web test -- --runInBand`
      Expected: still green after formatting.

- [ ] **Step 5: Sanity-check the final diff against TSK-28 scope**
      Review the final changes.
      Expected: the slice stays focused on switcher UX, recovery UX, and auth-backed active-workspace state without drifting into broader settings or invite-management work.

- [ ] **Step 6: Commit**
      `feat: ship the workspace switcher and active-workspace recovery ux`
