# Verify Email And OTP

This document explains the shared OTP verification flow used after signup and after blocked unverified sign-in.

## Purpose

The verify-email sub-feature is where account verification turns into session creation.

It has two jobs:

1. verify email ownership with a 6-digit OTP
2. complete the user's first authenticated session after signup or blocked sign-in

It also owns the browser-side resend gate.

## Primary Files

### Web

- `apps/web/src/routes/verify-email.tsx`
- `apps/web/src/domains/identity/authentication/ui/verify-email-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/email-verification-flow.ts`
- `apps/web/src/domains/identity/authentication/ui/login-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/signup-page.tsx`
- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`

### Auth

- `apps/auth/src/domains/identity/authentication/infra/auth.ts`
- `apps/auth/src/domains/identity/authentication/infra/auth.test.ts`
- `apps/auth/src/app.test.ts`

### Shared email layer

- `packages/email/src/contracts.ts`
- `packages/email/src/service.ts`
- `packages/email/src/templates/signup-verification-otp.ts`

## OTP Policy

Current Better Auth email OTP settings in `apps/auth/src/domains/identity/authentication/infra/auth.ts`:

- `otpLength: 6`
- `expiresIn: 300`
- `allowedAttempts: 3`
- `storeOTP: "hashed"`
- `overrideDefaultEmailVerification: true`

That translates into the current product contract:

- 6-digit verification code
- expires after 5 minutes
- 3 attempts before lockout behavior kicks in
- stored hashed in the auth persistence layer

## Flow Origins

There are two valid ways to reach `/verify-email`.

### Signup-originated flow

Created by `apps/web/src/domains/identity/authentication/ui/signup-page.tsx`.

Stored browser flow state:

```ts
{ email, reason: "" }
```

User-visible meaning:

- a brand new account exists
- the auth service sent a verification OTP
- no session exists yet

### Sign-in-originated flow

Created by `apps/web/src/domains/identity/authentication/ui/login-page.tsx`.

Stored browser flow state:

```ts
{ email, reason: "signin" }
```

User-visible meaning:

- the account already exists
- password sign-in was blocked because the email is still unverified
- auth has sent a fresh verification OTP on sign-in

## Route And Page Behavior

The route file `apps/web/src/routes/verify-email.tsx` stays thin.

It sanitizes search params into:

- `email: string`
- `reason: "signin" | ""`

The page `apps/web/src/domains/identity/authentication/ui/verify-email-page.tsx` owns the real logic.

### Missing email branch

If there is no usable email in the route state:

- the OTP form is not rendered
- the page shows an invalid-state card
- the user is told to restart from signup or login

### Stored flow interpretation

The page reads session storage using `readStoredEmailVerificationFlow()`.

It computes:

- `hasMatchingStoredFlow`
- `isSigninFlow`
- `canResend`

Current logic:

- `isSigninFlow` is true only when:
  - route `reason === "signin"`
  - stored flow email matches the page email
  - stored flow reason is also `"signin"`
- `canResend` is true when:
  - `isSigninFlow` is true, or
  - any stored flow exists for the same email

This means:

- signup-originated verification can resend
- signin-originated verification can resend and show the extra sign-in-specific explanation
- URL params alone cannot unlock sign-in messaging or resend UI

## Submit Flow

Current client behavior in `verify-email-page.tsx`:

1. require OTP length 6 before making a request
2. call `authClient.emailOtp.verifyEmail({ email, otp })`
3. on failure, map the error code to friendly copy
4. on success:
   - clear stored verification flow
   - navigate to `/`

The integration test in `apps/auth/src/app.test.ts` confirms the auth endpoint path used by the current implementation:

- `POST /api/auth/email-otp/verify-email`

Current success response shape asserted in tests:

- `status: true`
- `token: <string>`
- `user.email`
- `user.emailVerified: true`

The presence of `token` in the success payload, together with `autoSignInAfterVerification`, is the current evidence that verification is also the session-creation handoff point.

## Error Mapping

The page maps Better Auth/plugin errors into user-facing copy.

Current mappings:

- `INVALID_OTP` -> `That code is not valid. Check it and try again.`
- `OTP_EXPIRED` -> `That code expired. Request a new one and try again.`
- `TOO_MANY_ATTEMPTS` -> `That code is locked. Request a new one to keep going.`
- fallback -> backend message or `Unable to verify that code.`

These mappings are important because they are product-owned UX decisions layered on top of Better Auth/plugin internals.

## Resend Flow

The resend button calls:

```ts
authClient.emailOtp.sendVerificationOtp({
  email,
  type: "email-verification",
})
```

Current page behavior:

- clear prior notice/error
- disable the resend button while request is in flight
- on success show `A new verification code is on the way.`
- on failure show backend message or `Unable to send a new verification code.`

Important nuance:

- auth also sends a fresh OTP automatically on blocked sign-in because `sendOnSignIn = true`
- manual resend from the page still uses the `email-verification` type through the client plugin
- the shared email template used for OTP delivery is currently the signup verification template for both cases

## Why The Resend Gate Exists

This is one of the easiest parts of the slice to misunderstand.

The resend gate is not a server authorization system.
It is a browser UX constraint.

It exists because:

- the page takes `email` and `reason` from the URL
- if the page trusted `reason=signin` by itself, anyone could forge a query string and unlock sign-in-specific messaging and resend UI for arbitrary emails
- storing flow state locally lets the UI require evidence that the user actually came through signup or blocked sign-in in this browser context

The current design intentionally blocks:

- URL-only spoofing of `reason=signin`
- resend unlock after a failed OTP submission when no stored flow exists

The current design intentionally allows:

- resend from a real signup flow in the same browser session
- resend from a real blocked sign-in flow in the same browser session

## Why The Slice Works This Way

### OTP instead of link verification

Reason:

- the branch explicitly uses Better Auth's email OTP plugin and overrides default verification behavior
- the verify-email page is a first-class part of the product UX

### Verification creates the session

Reason:

- the product wants a single clean handoff from "account exists but is unverified" to "fully signed in"
- it avoids the odd state where signup succeeded and auto-signed in before email ownership was proven

### Shared page for signup and sign-in

Reason:

- the underlying action is the same: verify ownership of the email address
- it avoids two nearly identical screens

Tradeoff:

- small UI changes here can unintentionally affect two product flows at once

### SessionStorage instead of server-managed flow state

Reason:

- light implementation cost
- enough context to prevent naive query-param spoofing
- no need for an extra backend concept just to drive resend visibility

Tradeoff:

- tab-local
- user-controlled
- not appropriate for real server-side authorization

## Caveats

- `/verify-email` keeps the email address in the URL.
- Resend gating is a browser-side contract, not strong anti-abuse protection.
- Email delivery is still fire-and-forget, so the page can appear even if the provider failed to send the OTP.
- The OTP email template text is still signup-oriented even when triggered by blocked sign-in.
- The verify-email page is the convergence point for signup and login. Changes here require checking both flows.
- The browser clears stored flow only on successful verification. Stale state can linger for the session.

## Tests To Read Before Editing Verify-Email

- `apps/web/src/domains/identity/authentication/ui/auth-pages.test.tsx`
- `apps/auth/src/app.test.ts`
- `apps/auth/src/domains/identity/authentication/infra/auth.test.ts`

These are the tests that currently define whether the resend gate, OTP mapping, and auto-sign-in-after-verification behavior still match the slice contract.
