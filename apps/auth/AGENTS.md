# Auth App Intent

Follow the root `AGENTS.md` and `apps/AGENTS.md` first. This node adds guidance
for the deployable auth application in this subtree.

## Scope

- `apps/auth` is a Hono + Node.js application auth service.
- Railway deployment and healthcheck behavior live with this app.

## Rules

- Keep HTTP entrypoints and server bootstrap thin; push behavior into
  slice-owned modules under `src/domains/*`.
- Treat `apps/auth/railway.toml` as the source of truth for Railway-specific
  build, start, and healthcheck expectations.
- Preserve the `/up` response shape to match `apps/web`.
- Export route contracts intentionally so typed consumers can use this app via
  Hono RPC without redefining endpoint types.
- Keep Better Auth wiring, environment parsing, and provider selection inside
  `apps/auth`; shared packages should stay environment-agnostic.
- Treat auth email hooks as auth-owned integration code: compose URLs,
  callback behavior, and background-delivery semantics here rather than pushing
  those decisions into `packages/*`.
- Preserve Better Auth's security-sensitive auth semantics unless the task
  explicitly changes them. In particular, be careful with signup, password
  reset, and duplicate-account flows where delivery failures or callback
  changes can affect enumeration resistance or user-visible outcomes.
