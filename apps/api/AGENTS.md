# API App Intent

Follow the root `AGENTS.md` and `apps/AGENTS.md` first. This node adds guidance
for the deployable API application in this subtree.

## Scope

- `apps/api` is a Hono + Node.js application API service.
- Railway deployment and healthcheck behavior live with this app.

## Rules

- Keep HTTP entrypoints and server bootstrap thin; push behavior into
  slice-owned modules under `src/domains/*`.
- Treat `apps/api` as the primary owner for app-level command contracts,
  workflow orchestration, and auth-aware sync proxy surfaces for collaborative
  product state.
- Treat `apps/api/railway.toml` as the source of truth for Railway-specific
  build, start, and healthcheck expectations.
- Keep Railway `DATABASE_URL` wiring pointed at `${{Postgres.DATABASE_URL}}`
  instead of checking in or documenting static Postgres connection strings for
  this app.
- Keep permission checks, mutation semantics, and sync authorization at this
  boundary rather than teaching browsers to write shared tables directly.
- Prefer command responses that can carry both domain payloads and sync
  confirmation metadata when a slice needs the client to reconcile through the
  shared sync layer.
- Consume shared database clients, schema, and migrations from `@workspace/db`
  rather than reintroducing API-owned migration tooling under `apps/api`.
- Preserve the `/up` response shape to match `apps/web`.
- Export route contracts intentionally so typed consumers can use this app via
  Hono RPC without redefining endpoint types.
