# Change Checklist

Use this checklist before changing any part of the identity/authentication slice.

It is meant for both humans and agents. The goal is simple: do not change one layer and forget the other layers that make the flow work.

## When This Checklist Applies

Use it for any change touching:

- login
- signup
- verify-email / OTP
- password reset
- auth env or runtime URLs
- Better Auth config
- auth cookies or CORS
- auth email delivery
- auth schema assumptions

## 1. Decide Which Contract You Are Changing

Before editing code, answer these questions in plain language:

- Is this a UX-only change?
- Is this a response-shape change?
- Is this a product-policy change?
- Is this an operational-config change?
- Is this a persistence/schema change?

If the answer is "more than one," plan to edit and verify multiple boundaries together.

## 2. Check The Ownership Boundary First

If you are changing...

- page copy, form validation, navigation, route-level rendering -> start in `apps/web`
- auth semantics, duplicate handling, session rules, CORS, cookies, provider selection -> start in `apps/auth`
- email templates, transport contracts, provider-agnostic email API -> start in `packages/email`
- table shape, unique constraints, shared DB client behavior -> start in `packages/db`

Do not move auth policy into `packages/email`.
Do not move page logic into `apps/auth`.

## 3. Files Most Likely To Need Review Together

### Any signup change

- `apps/web/src/domains/identity/authentication/ui/signup-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/email-verification-flow.ts`
- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- `apps/auth/src/domains/identity/authentication/routes.ts`
- `apps/auth/src/domains/identity/authentication/routes.test.ts`
- `apps/auth/src/domains/identity/authentication/infra/auth.ts`
- `apps/auth/src/app.test.ts`

### Any login change

- `apps/web/src/domains/identity/authentication/ui/login-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/verify-email-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/email-verification-flow.ts`
- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- `apps/auth/src/domains/identity/authentication/infra/auth.ts`
- `apps/auth/src/app.test.ts`

### Any verify-email / OTP change

- `apps/web/src/routes/verify-email.tsx`
- `apps/web/src/domains/identity/authentication/ui/verify-email-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/email-verification-flow.ts`
- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- `apps/auth/src/domains/identity/authentication/infra/auth.ts`
- `apps/auth/src/domains/identity/authentication/infra/auth.test.ts`
- `apps/auth/src/app.test.ts`
- `packages/email/src/templates/signup-verification-otp.ts`

### Any password reset change

- `apps/web/src/domains/identity/authentication/ui/forgot-password-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/reset-password-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- `apps/auth/src/domains/identity/authentication/infra/auth.ts`
- `apps/auth/src/domains/identity/authentication/infra/email-service.ts`
- `apps/auth/src/app.test.ts`
- `packages/email/src/templates/password-reset.ts`

### Any runtime/config/cookie/CORS change

- `apps/web/src/domains/identity/authentication/ui/auth-client.ts`
- `apps/web/src/domains/identity/authentication/ui/auth-client.test.ts`
- `apps/web/src/routes/__root.tsx`
- `apps/auth/src/domains/identity/authentication/infra/env.ts`
- `apps/auth/src/domains/identity/authentication/infra/env.test.ts`
- `apps/auth/src/domains/identity/authentication/infra/cookie-attributes.ts`
- `apps/auth/src/domains/identity/authentication/infra/cookie-attributes.test.ts`
- `apps/auth/src/domains/identity/authentication/routes.ts`
- `apps/auth/railway.toml`
- `apps/web/railway.toml`

## 4. Invariants To Reconfirm

These should stay true unless the product requirement explicitly changes.

- Signup success navigates to `/verify-email`, not `/`.
- Signup success stores browser verification flow state.
- Duplicate signup returns explicit `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`.
- Duplicate signup is serialized under concurrency.
- Malformed signup payloads still delegate to Better Auth validation.
- Password sign-in requires verified email.
- Unverified sign-in stores `reason: "signin"` and redirects into `/verify-email`.
- Verify-email resend UI is not unlocked by URL params alone.
- Verification success clears stored flow state and navigates home.
- Password reset request remains generic for privacy.
- `packages/email` remains provider-agnostic and env-agnostic.

## 5. Questions To Answer Before Merging

### Product semantics

- Does this change alter whether account existence is exposed?
- Does this change alter whether signup/login/verification create a session?
- Does this change alter whether an unverified user is redirected into OTP verification?
- Does this change alter resend visibility or eligibility?

### Operational semantics

- Does this require different trusted origins?
- Does this require different cookie `SameSite` behavior?
- Does this require different runtime auth URL resolution?
- Does Railway need a watch-pattern or env update?

### Persistence semantics

- Does this rely on direct SQL against auth tables?
- Does this change any assumption about unique email behavior?
- Does this require a schema migration or test fixture update?

## 6. Tests To Run By Change Type

### Minimal slice-wide auth checks

- `pnpm --filter auth test`
- `pnpm --filter web exec vitest run src/domains/identity/authentication/ui/auth-pages.test.tsx`

### If email templates/contracts changed

- `pnpm --filter @workspace/email test`

### If auth-client runtime behavior changed

- `pnpm --filter web exec vitest run src/domains/identity/authentication/ui/auth-client.test.ts`

### If env/cookie behavior changed

- `pnpm --filter auth exec vitest run src/domains/identity/authentication/infra/env.test.ts src/domains/identity/authentication/infra/cookie-attributes.test.ts`

## 7. Common Failure Modes

### Login page still works locally, fails in deployed environments

Usually means one of:

- auth base URL resolution is wrong
- trusted origins are wrong
- cookies are not usable cross-origin
- runtime dataset injection in `__root.tsx` no longer matches deployment reality

### Signup duplicate behavior becomes flaky

Usually means one of:

- route-level duplicate guard was bypassed
- email parsing no longer matches the request shape
- advisory lock logic was changed or removed
- schema assumptions about email uniqueness changed

### Verify-email resend UI becomes too permissive

Usually means one of:

- query params were trusted directly
- sessionStorage flow checks were removed or loosened
- failed verification started unlocking resend again

### Reset emails look right locally but not in production

Usually means one of:

- provider selection changed in `apps/auth`
- `RESEND_API_KEY` or sender config is wrong
- auth runtime URL / redirect target assumptions drifted

## 8. Docs To Update When The Slice Changes

If behavior changes, update:

- `docs/architecture/identity-authentication/README.md`
- `docs/architecture/identity-authentication/shared-foundations.md`
- the relevant sub-feature deep-dive doc in this folder

If the ownership model changes, also update:

- `docs/architecture/domain-driven-feature-slices.md`

## 9. Short Rule For Future Agents

Do not treat this slice as a single page flow.

It is a cross-origin, multi-app capability with product rules living in `apps/auth`, browser recovery state living in `apps/web`, email primitives living in `packages/email`, and schema assumptions living in `packages/db`.

If you change one boundary, inspect the others.
