# TSK-27 Join Workspace And Invite Acceptance Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the web-side join-workspace flow so users can accept workspace invites by manual code or signed link, preserve that intent through auth, and land inside the invited workspace immediately after acceptance.

**Architecture:** Keep the auth contract in `apps/auth` as-is unless implementation proves a concrete gap. Build a dedicated web slice under `apps/web/src/domains/workspaces/join-workspace` for the public invite-entry surface, and let both manual code entry and signed-link acceptance funnel through the same `POST /api/workspaces/invites/accept` client. Preserve pending invite intent in a small browser-side flow helper so signed-out users can pass through login, signup, and verify-email without losing the invite they were trying to accept.

**Tech Stack:** TanStack Start, TanStack Router, TanStack Form, Zod, Better Auth client, Vitest, pnpm, Ultracite

---

## Chunk 1: Join-Workspace Client And Flow State

### Task 1: Add The Invite-Acceptance Client And Browser Flow Helper

**Files:**

- Create: `apps/web/src/domains/workspaces/join-workspace/contracts/join-workspace-contract.ts`
- Create: `apps/web/src/domains/workspaces/join-workspace/infra/accept-workspace-invite.ts`
- Create: `apps/web/src/domains/workspaces/join-workspace/infra/accept-workspace-invite.test.ts`
- Create: `apps/web/src/domains/workspaces/join-workspace/ui/workspace-invite-flow.ts`
- Modify: `apps/web/src/domains/identity/settings-admin/infra/read-auth-service-error-message.ts`

- [ ] **Step 1: Write the failing client tests first**
      In `accept-workspace-invite.test.ts`, cover:
      accepting by `code`,
      accepting by `token`,
      rejecting malformed JSON,
      rejecting schema-invalid bootstrap payloads,
      and surfacing auth-service `message` responses for revoked, invalid, or already-used invites.

- [ ] **Step 2: Define the join-workspace input contract**
      In `join-workspace-contract.ts`, add explicit Zod-backed input types for:
      `code` acceptance,
      `token` acceptance,
      and a persisted browser flow state that stores exactly one invite identifier.
      Reuse `workspaceBootstrapSchema` for the success payload instead of inventing a parallel response type.

- [ ] **Step 3: Build the auth client on top of `fetchAuthService`**
      Implement `acceptWorkspaceInvite` in `accept-workspace-invite.ts` so it:
      posts JSON to `/api/workspaces/invites/accept`,
      sends exactly one of `code` or `token`,
      reuses `readAuthServiceErrorMessage`,
      validates the returned bootstrap with `workspaceBootstrapSchema`,
      and throws clear errors for malformed or schema-invalid payloads.

- [ ] **Step 4: Add a small browser flow helper**
      In `workspace-invite-flow.ts`, persist and clear the pending invite identifier in `sessionStorage`.
      Keep this helper narrow:
      read pending invite flow,
      persist flow from code or token,
      clear flow after success,
      and expose one `join-workspace` target path builder so the auth pages do not hand-roll redirects.

- [ ] **Step 5: Verify the client layer**
      Run: `pnpm --filter web test -- accept-workspace-invite`
      Expected: the new invite-acceptance client tests pass.

- [ ] **Step 6: Commit**
      `feat(web): add join workspace auth client`

---

## Chunk 2: Public Join-Workspace Route And Page States

### Task 2: Add The `/join-workspace` Route And Shared Acceptance UI

**Files:**

- Create: `apps/web/src/routes/join-workspace.tsx`
- Create: `apps/web/src/domains/workspaces/join-workspace/ui/join-workspace-page.tsx`
- Create: `apps/web/src/domains/workspaces/join-workspace/ui/join-workspace-form.tsx`
- Create: `apps/web/src/domains/workspaces/join-workspace/ui/join-workspace-page.test.tsx`

- [ ] **Step 1: Add failing page-level tests**
      In `join-workspace-page.test.tsx`, cover:
      manual short-code entry,
      signed-link token bootstrapping from search params,
      missing-token invalid-link state,
      successful acceptance navigating to `/app`,
      and the main non-actionable branches:
      invalid,
      revoked,
      already-used,
      and wrong-account acceptance.

- [ ] **Step 2: Create the route wrapper**
      In `apps/web/src/routes/join-workspace.tsx`, validate search params so `token` is optional and string-only.
      Do not redirect authenticated users away from this route, because existing members may still use invite links to join a second workspace.

- [ ] **Step 3: Build one page around two surfaces**
      In `join-workspace-page.tsx`, render:
      a signed-link path when `token` exists,
      and a manual code-entry path when it does not.
      Follow the same page-level invalid-state pattern as `reset-password-page.tsx` and `verify-email-page.tsx` so missing or unusable invite inputs fail cleanly at the page shell level.

- [ ] **Step 4: Build the acceptance form**
      In `join-workspace-form.tsx`, use TanStack Form plus shared form primitives to submit exactly one of `code` or `token`.
      When the user is already authenticated, call `acceptWorkspaceInvite` directly and navigate to `/app` on success.
      When the user is signed out, persist the invite flow and send them into auth instead of attempting the accept call anonymously.

- [ ] **Step 5: Keep user-facing error copy local to the page**
      Normalize backend messages into cleaner UI copy in the join-workspace slice rather than changing auth behavior unless a real contract gap appears.
      Treat revoked, already-used, and otherwise non-actionable invites as page-level recovery states with clear next steps.

- [ ] **Step 6: Verify the public route UI**
      Run: `pnpm --filter web test -- join-workspace-page`
      Expected: the join-workspace page tests pass.

- [ ] **Step 7: Commit**
      `feat(web): add join workspace route and acceptance page`

---

## Chunk 3: Preserve Invite Intent Through Auth

### Task 3: Thread Pending Invite Flow Through Login, Signup, And Verify Email

**Files:**

- Modify: `apps/web/src/domains/identity/authentication/ui/login-form.tsx`
- Modify: `apps/web/src/domains/identity/authentication/ui/signup-form.tsx`
- Modify: `apps/web/src/domains/identity/authentication/ui/verify-email-form.tsx`
- Modify: `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- Modify: `apps/web/src/domains/identity/authentication/ui/login-page.tsx`
- Modify: `apps/web/src/domains/identity/authentication/ui/signup-page.tsx`

- [ ] **Step 1: Add failing auth-flow tests**
      Extend `auth-pages.test.tsx` so it covers:
      login success returning to `/join-workspace` when a pending invite flow exists,
      signup preserving invite intent through verify-email,
      verify-email success returning to `/join-workspace` instead of `/`,
      and clearing stored invite flow once the user has been handed back to the join-workspace route.

- [ ] **Step 2: Teach login to respect pending invite flow**
      In `login-form.tsx`, check `workspace-invite-flow.ts` after successful sign-in.
      If invite state exists, navigate to the join-workspace target instead of `/`.
      Preserve the existing email-verification redirect behavior for unverified sign-ins.

- [ ] **Step 3: Keep signup lightweight but invite-aware**
      In `signup-form.tsx`, do not try to accept the invite during signup.
      Keep signup focused on account creation, preserve the pending invite flow in storage, and continue sending the user to `/verify-email` as today.

- [ ] **Step 4: Return from verify-email into invite acceptance**
      In `verify-email-form.tsx`, after a successful email verification, check for stored invite flow before falling back to `/`.
      Clear both the email-verification flow and the invite flow at the appropriate point so stale session storage does not hijack later auth visits.

- [ ] **Step 5: Keep auth-page copy aligned**
      Make only the minimal `login-page.tsx` and `signup-page.tsx` copy changes needed so invite-driven auth still reads naturally.
      Do not turn auth into a workspace-owned UI; just acknowledge that it can resume a pending join flow.

- [ ] **Step 6: Verify auth page behavior**
      Run: `pnpm --filter web test -- auth-pages`
      Expected: auth page tests pass with the new invite-resume cases.

- [ ] **Step 7: Commit**
      `feat(web): resume join workspace flow through auth`

---

## Chunk 4: Replace The Onboarding Placeholder And Finalize Coverage

### Task 4: Add The Secondary Onboarding Entry For Joining A Workspace

**Files:**

- Modify: `apps/web/src/domains/workspaces/onboarding/ui/workspace-onboarding-page.tsx`
- Modify: `apps/web/src/domains/workspaces/onboarding/ui/create-workspace-form.tsx`
- Modify: `apps/web/src/domains/workspaces/onboarding/ui/workspace-onboarding-page.test.tsx`

- [ ] **Step 1: Add failing onboarding tests**
      Extend `workspace-onboarding-page.test.tsx` to assert that onboarding-required users now see:
      the primary create-workspace path,
      a secondary join-by-invite path,
      and no leftover “TSK-27 lands later” placeholder copy.

- [ ] **Step 2: Keep create-workspace primary**
      Preserve the current create form as the primary onboarding action.
      Do not inline a second form that competes with it on the same card.

- [ ] **Step 3: Add the secondary join entry**
      In `workspace-onboarding-page.tsx`, add a clear secondary CTA that routes to `/join-workspace`.
      This should be available only in the onboarding-required branch, not in the recovery-selection fallback that belongs to the follow-up workspace switcher issue.

- [ ] **Step 4: Remove obsolete placeholder copy**
      Update `create-workspace-form.tsx` so it stops referring to TSK-27 as future work.
      Replace that copy with language that supports the new secondary join path without diluting the create-first hierarchy.

- [ ] **Step 5: Verify onboarding coverage**
      Run: `pnpm --filter web test -- workspace-onboarding-page`
      Expected: onboarding tests pass with the new join entry.

- [ ] **Step 6: Commit**
      `feat(web): add join workspace onboarding entry`

---

## Chunk 5: Final Verification And Cleanup

### Task 5: Verify The Full TSK-27 Slice

**Files:**

- Modify: any touched files from Tasks 1-4

- [ ] **Step 1: Run the focused web suite for touched slices**
      Run: `pnpm --filter web test -- --runInBand`
      Expected: join-workspace, auth-page, onboarding, and existing workspace shell tests all pass together.

- [ ] **Step 2: Run repo formatting and lint fixes**
      Run: `pnpm exec ultracite fix`
      Expected: formatting and lint fixes apply cleanly.

- [ ] **Step 3: Re-run the web suite after Ultracite**
      Run: `pnpm --filter web test -- --runInBand`
      Expected: still green after formatting.

- [ ] **Step 4: Sanity-check that no auth-side changes slipped in unnecessarily**
      Review the final diff.
      Expected: the implementation stays web-owned unless a clearly justified auth contract fix was required during execution.

- [ ] **Step 5: Commit**
      `feat: ship the TSK-27 join workspace flow`
