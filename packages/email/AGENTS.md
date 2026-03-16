# Email Package Intent

Follow the root `AGENTS.md` and `packages/AGENTS.md` first. This node adds
guidance for the shared transactional email package in this subtree.

## Scope

- `packages/email` owns shared transactional email primitives for auth flows
  and future workspace consumers.
- This package is a stable infrastructure boundary, not a home for app-specific
  auth policy or environment loading.

## Rules

- Keep the public surface small and explicit. Export only the root package API
  that consumers are meant to call.
- Keep the package provider-agnostic at the boundary. Provider-specific logic
  belongs in isolated transports, while app-specific provider selection stays
  with the consuming app.
- Do not read `process.env` in this package. Accept typed configuration from the
  caller instead.
- Keep templates code-owned in this package and render both `html` and `text`
  variants for each email.
- Preserve a Node-targeted `tsdown` build and keep export-map changes deliberate
  because downstream apps import the built package surface.
- Make the console transport useful for local development by exposing enough of
  the rendered message payload to debug auth flows without a real provider.
