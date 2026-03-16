# API App Intent

Follow the root `AGENTS.md` and `apps/AGENTS.md` first. This node adds guidance
for the deployable API application in this subtree.

## Scope

- `apps/api` is a Hono + Node.js application API service.
- Railway deployment and healthcheck behavior live with this app.

## Rules

- Keep HTTP entrypoints and server bootstrap thin; push behavior into
  slice-owned modules under `src/domains/*`.
- Treat `apps/api/railway.toml` as the source of truth for Railway-specific
  build, start, and healthcheck expectations.
- Consume shared database clients, schema, and migrations from `@workspace/db`
  rather than reintroducing API-owned migration tooling under `apps/api`.
- Preserve the `/up` response shape to match `apps/web`.
- Export route contracts intentionally so typed consumers can use this app via
  Hono RPC without redefining endpoint types.
