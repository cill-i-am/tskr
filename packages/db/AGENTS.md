# DB Package Intent

Follow the root `AGENTS.md` and `packages/AGENTS.md` first. This node adds
guidance for the shared database platform in this subtree.

## Scope

- `packages/db` owns the shared Postgres schema model, Drizzle config,
  migration history, and reusable Node database client helpers.
- This package is the canonical database boundary for apps that share the same
  Railway Postgres instance.

## Rules

- Keep the database migration history centralized here; do not recreate
  service-owned migration pipelines under `apps/*`.
- Treat Postgres as the canonical shared state store for both command handlers
  and sync-backed read models.
- Treat Postgres schema boundaries such as `auth` and `app` as explicit
  ownership lines, and keep shared migration metadata separate from product
  schemas.
- Keep replication prerequisites, publication readiness, and other synced-table
  constraints close to this package when they affect shared tables.
- Preserve an intentional package export surface so consumers import from
  `@workspace/db` instead of reaching into internal paths arbitrarily.
- Keep package build, Drizzle config, and generated migration artifacts local
  to this package.
- Do not move per-screen shape filters, permission policy, or workflow-specific
  mutation behavior into this package.
- When a new app or service needs the shared database, integrate it by consuming
  this package rather than cloning schema or connection logic.
