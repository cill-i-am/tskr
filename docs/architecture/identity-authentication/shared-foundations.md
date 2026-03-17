# Shared Foundations

This document explains the cross-cutting structure behind the identity/authentication slice.

It answers four questions:

1. Which layer owns what?
2. What infrastructure has to stay aligned for the slice to work?
3. Which design choices are deliberate rather than accidental?
4. What should future editors verify before changing any sub-feature?

## Slice Boundary

The slice follows the repo model described in `docs/architecture/domain-driven-feature-slices.md`.

It is one capability spanning multiple apps and packages:

- `apps/web` owns browser UX and route composition
- `apps/auth` owns auth rules and integration with Better Auth
- `packages/email` owns reusable transactional email primitives
- `packages/db` owns the shared auth schema and DB client surface

The slice is organized by domain first, not by technology first. The current internal layering is light, but the ownership lines are already clear.

## Ownership by Boundary

### `apps/web`

Primary files:

- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/signup.tsx`
- `apps/web/src/routes/verify-email.tsx`
- `apps/web/src/routes/forgot-password.tsx`
- `apps/web/src/routes/reset-password.tsx`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/domains/identity/authentication/ui/auth-client.ts`
- `apps/web/src/domains/identity/authentication/ui/auth-page-shell.tsx`
- `apps/web/src/domains/identity/authentication/ui/login-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/signup-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/verify-email-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/email-verification-flow.ts`
- `apps/web/src/domains/identity/authentication/ui/forgot-password-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/reset-password-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/home-session-card.tsx`

What web owns:

- auth routes and page composition
- form collection and local validation
- navigation after auth events
- session display via Better Auth React client
- browser-only flow context in `sessionStorage`
- runtime resolution of the auth service base URL

What web does not own:

- password/session rules
- duplicate-account semantics
- email-delivery policy
- token issuance
- direct DB reads/writes

### `apps/auth`

Primary files:

- `apps/auth/src/app.ts`
- `apps/auth/src/index.ts`
- `apps/auth/src/domains/identity/authentication/index.ts`
- `apps/auth/src/domains/identity/authentication/routes.ts`
- `apps/auth/src/domains/identity/authentication/infra/auth.ts`
- `apps/auth/src/domains/identity/authentication/infra/env.ts`
- `apps/auth/src/domains/identity/authentication/infra/cookie-attributes.ts`
- `apps/auth/src/domains/identity/authentication/infra/database.ts`
- `apps/auth/src/domains/identity/authentication/infra/email-service.ts`

What auth owns:

- Better Auth instantiation and plugin configuration
- all `/api/auth/*` traffic
- trusted-origin CORS policy
- auth cookie defaults
- duplicate-signup guard logic
- provider selection and email-service construction
- direct SQL access to auth tables when the slice needs behavior beyond Better Auth defaults

What auth does not own:

- page UX
- route-level browser navigation
- design-system rendering concerns

### `packages/email`

Primary files:

- `packages/email/src/contracts.ts`
- `packages/email/src/service.ts`
- `packages/email/src/templates/password-reset.ts`
- `packages/email/src/templates/signup-verification-otp.ts`
- `packages/email/src/templates/email-verification.ts`
- `packages/email/src/templates/existing-user-sign-up-notice.ts`
- `packages/email/src/transports/console.ts`
- `packages/email/src/transports/resend.ts`

What email owns:

- typed email contracts
- transport abstraction
- HTML and text template rendering
- shared package API for sending auth-related emails

What email does not own:

- `process.env`
- provider selection logic
- auth-specific runtime policy
- duplicate-signup product decisions

### `packages/db`

Primary files:

- `packages/db/src/client.ts`
- `packages/db/src/schema/auth.ts`

What db owns:

- the canonical shared auth schema
- the Postgres client surface used by auth
- migration ownership

What db does not own:

- slice-specific auth behavior
- Better Auth configuration
- any page or transport logic

## Runtime Topology

The slice assumes split web and auth services, even when running locally.

### Web -> Auth relationship

The browser calls the auth service directly through the Better Auth client in `apps/web/src/domains/identity/authentication/ui/auth-client.ts`.

Auth base URL resolution order:

1. `document.documentElement.dataset.authBaseUrl`
2. `import.meta.env.VITE_AUTH_BASE_URL`
3. `http://localhost:3002` for direct localhost
4. `https://auth.tskr.localhost:1355` otherwise

The root route in `apps/web/src/routes/__root.tsx` injects the runtime data attribute using:

1. the browser document dataset if already present
2. `process.env.VITE_AUTH_BASE_URL`
3. `process.env.RAILWAY_SERVICE_AUTH_URL` mapped to `https://<value>`

That means the runtime service URL is part of the slice contract, not just a build-time detail.

### Portless and direct-localhost modes

`apps/auth/src/domains/identity/authentication/infra/env.ts` changes defaults based on `PORTLESS`.

Portless mode defaults:

- auth: `https://auth.tskr.localhost:1355`
- web: `https://web.tskr.localhost:1355`

Direct localhost mode defaults:

- auth: `http://localhost:3002`
- web: `http://localhost:3000`
- extra trusted origin: `http://localhost:5173`

This matters for local cookies, CORS, and browser auth-client routing.

### Railway assumptions

Relevant files:

- `apps/auth/railway.toml`
- `apps/web/railway.toml`

Current auth Railway watch patterns intentionally include `packages/email` because auth behavior depends on shared email templates/contracts.

If auth and email code change together but auth does not redeploy, the slice can drift in production.

## Core Auth Configuration

The canonical auth semantics live in `apps/auth/src/domains/identity/authentication/infra/auth.ts`.

Current Better Auth rules:

- `basePath: "/api/auth"`
- `baseURL: authenticationEnv.betterAuthUrl`
- Postgres-backed Drizzle adapter using `authDatabaseSchema`
- email/password auth enabled
- signup does not auto-sign in
- email verification is required before password sign-in
- successful verification is configured to auto-sign in
- sign-up and sign-in both trigger verification emails for unverified users

Email OTP plugin settings:

- 6-digit code
- 5 minute expiry (`expiresIn: 300`)
- 3 attempts
- hashed OTP storage
- default email verification overridden by OTP flow

These are not incidental values. The tests in `apps/auth/src/domains/identity/authentication/infra/auth.test.ts` treat them as current invariants.

## Duplicate Signup Design

Duplicate signup behavior is one of the most deliberate parts of the slice.

Relevant files:

- `apps/auth/src/domains/identity/authentication/routes.ts`
- `apps/auth/src/domains/identity/authentication/routes.test.ts`
- `apps/auth/src/app.test.ts`

Current behavior:

- only `POST /api/auth/sign-up/email` is intercepted
- email is parsed from JSON or form-urlencoded bodies
- email is normalized with `trim().toLowerCase()`
- a Postgres advisory lock is acquired per normalized email
- an existence query runs against `auth.user`
- if user exists, auth returns:
  - HTTP `422`
  - `code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"`
- malformed signup payloads fall through to Better Auth instead of failing in the wrapper

Why this exists:

- Better Auth defaults alone did not express the product rule we wanted
- the product now explicitly rejects duplicate signup instead of using a generic-success path
- advisory locking prevents two concurrent requests for the same email from both passing the precheck

Tradeoff:

- it improves product clarity
- it leaks account existence and is therefore not enumeration-resistant

That tradeoff is intentional in the current branch.

## Browser Flow State

The slice uses a very small amount of browser-owned state in `apps/web/src/domains/identity/authentication/ui/email-verification-flow.ts`.

Stored value:

```ts
{
  email: string,
  reason: "signin" | ""
}
```

Storage properties:

- stored in `sessionStorage`
- SSR-safe guards return `null` on the server
- malformed values are ignored
- state is cleared on successful OTP verification

What this state is for:

- distinguish signup-triggered and sign-in-triggered verification flows
- prevent query params alone from unlocking sign-in-specific resend UI
- allow resend only when the browser has local evidence that the user came through a legitimate flow in this tab/session

What it is not for:

- server-side authorization
- abuse prevention
- durable cross-device verification state

The resend gate is a UX-level guardrail. It is not a security boundary.

## Email Delivery Architecture

`packages/email` provides provider-agnostic infrastructure.

`apps/auth/src/domains/identity/authentication/infra/email-service.ts` applies app-owned policy by:

- choosing console or Resend transport
- requiring `RESEND_API_KEY` when provider is `resend`
- setting `appName`, `from`, `replyTo`, and OTP expiry copy

Current contracts in `packages/email/src/contracts.ts` include:

- `sendPasswordResetEmail({ resetUrl, to })`
- `sendSignupVerificationOtpEmail({ code, to })`
- `sendEmailVerificationEmail({ verificationUrl, to })`
- `sendExistingUserSignupNotice({ signInUrl, to })`

Important current-state caveat:

- the shared email package still supports `sendExistingUserSignupNotice`
- the auth app intentionally does not use it anymore
- future editors should not wire it back in by accident just because the method still exists

Another important caveat:

- auth email hooks are fire-and-forget
- delivery failures are logged with `console.error`
- the auth response still succeeds

This keeps auth flows resilient to provider instability, but it also means users can be redirected into verify/reset flows even if no message was delivered.

## Persistence Model

The auth schema lives in `packages/db/src/schema/auth.ts`.

Current tables used by the slice:

- `auth.user`
- `auth.session`
- `auth.account`
- `auth.verification`

Important facts:

- `auth.user.email` is unique
- `auth.session.token` is unique
- reset-token and verification-like records are stored under `auth.verification`

The auth app mixes:

- Better Auth + Drizzle adapter for core auth operations
- direct SQL for duplicate-signup checks and test helpers

That means future schema changes must be checked against both Drizzle usage and raw SQL assumptions.

## Cross-Cutting Invariants

Do not break these unless the product requirement changes:

- signup success returns the user to `/verify-email`, not `/`
- duplicate signup is explicit and 422-based
- malformed signup requests still delegate to Better Auth validation
- unverified password sign-in triggers a fresh OTP path, not a generic auth failure
- verification success returns a token and verified user payload in current auth tests
- verify-email resend UI does not trust query params alone
- `packages/email` stays environment-agnostic
- route files remain thin wrappers over slice modules

## Operational Checklist Before Editing

When you change this slice, verify all of these together:

1. `apps/web/src/domains/identity/authentication/ui/auth-client.ts`
2. `apps/web/src/routes/__root.tsx`
3. `apps/auth/src/domains/identity/authentication/infra/env.ts`
4. `apps/auth/src/domains/identity/authentication/infra/cookie-attributes.ts`
5. `apps/auth/src/domains/identity/authentication/routes.ts`
6. `apps/auth/src/domains/identity/authentication/infra/auth.ts`
7. `apps/auth/railway.toml`
8. relevant email templates/contracts in `packages/email`
9. the auth schema or raw SQL expectations in `packages/db`

The most common failure mode in this slice is changing one layer and forgetting the cross-origin, cookie, or client-plugin contract that makes the rest work.

## Tests That Anchor The Foundations

- `apps/auth/src/app.test.ts`
- `apps/auth/src/domains/identity/authentication/routes.test.ts`
- `apps/auth/src/domains/identity/authentication/infra/auth.test.ts`
- `apps/auth/src/domains/identity/authentication/infra/env.test.ts`
- `apps/auth/src/domains/identity/authentication/infra/cookie-attributes.test.ts`
- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- `apps/web/src/domains/identity/authentication/ui/auth-client.test.ts`

Read those before making behavior changes. They are the fastest way to see which assumptions are intentional.
