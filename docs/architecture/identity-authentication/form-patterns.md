# Auth And Workspace Form Patterns

This document defines the shared form composition pattern for the current auth
slice and the upcoming workspace onboarding and settings flows.

## Decision Summary

- Keep Better Auth as auth infrastructure, not as the owner of web form UI.
- Use `@workspace/ui` for reusable form presentation adapters and shared field
  primitives.
- Keep TanStack Form setup, Zod schemas, submit handlers, navigation, and
  server-error mapping inside the owning slice.
- Prefer slice-local exceptions over making `@workspace/ui` absorb a brittle
  one-off pattern.

## Better Auth UI Recommendation

As of March 27, 2026, this repo uses `better-auth@1.5.5`. npm `latest` is
`1.5.6`, published March 22, 2026.

The current Better Auth docs and package surface are strong on auth APIs,
plugins, and integrations, but they do not provide a stable first-party UI
surface that should become the foundation for this repo’s auth and workspace
forms.

Recommendation:

- use Better Auth for auth behavior and client/server APIs
- borrow flow ideas or response semantics when useful
- do not standardize on Better Auth-owned UI for this slice

## Ownership Boundary

`@workspace/ui` owns:

- `Field`, `FieldGroup`, `FieldDescription`, `FieldError`
- `FormFieldShell`
- `FormTextField`
- `FormTextareaField`
- `FormSelectField`
- `FormOtpField`
- `FormMessage`
- `FormActions`

Slice code owns:

- `useForm(...)`
- `defaultValues`
- Zod schemas and validators
- TanStack field names and value shapes
- Better Auth client calls
- route navigation and redirects
- form-level success/error state
- any domain-specific server error mapping

## Standard Pattern

Use this structure by default:

1. Define the form schema beside the slice.
2. Create the TanStack form in the slice component.
3. Render shared adapters from `@workspace/ui/components/form`.
4. Keep form-level messages and action rows in the slice.
5. Keep domain-specific behavior local instead of expanding the shared API
   prematurely.

## Control Guidance

Use `FormTextField` for:

- login email
- passwords
- full name
- workspace name
- invite code

Use `FormTextareaField` for:

- workspace description
- profile/about-style fields

Use `FormSelectField` for:

- role selection
- future workspace-scoped enum selections

Use `FormOtpField` for:

- email verification OTP
- any future short fixed-length auth code input

Use `FormFieldShell` directly only when the shared adapters are almost right but
the slice has one narrow exception. The login password field with the adjacent
“Forgot your password?” link is the current example of that escape hatch.

## Validation And Error Rules

- Field invalid state comes from `field.state.meta.isTouched` plus field errors,
  unless a slice explicitly passes `invalid` for a server-side override.
- Put `data-invalid` on `Field` and `aria-invalid` on the control.
- Let `FormMessage` and `FieldError` own message filtering and deduplication.
- Keep form-level errors outside individual fields.
- Clear server-only error state in slice code, not in `@workspace/ui`.

## Migration Notes

The auth slice is the proving ground for this pattern:

- signup
- login
- forgot password
- reset password
- verify email

The next consumers should be:

- create workspace
- join workspace by invite code
- account profile
- workspace profile
- users/roles and invite forms

## When Not To Extend `@workspace/ui`

Do not add shared form APIs just because one screen needs:

- route-specific link placement
- Better Auth-specific copy
- one-off success banners
- slice-specific submission choreography

Handle those locally until there is a second real consumer.
