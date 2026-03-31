# Apps Intent

Follow the root `AGENTS.md` first. This node adds guidance for deployable
applications under `apps/*`.

## Scope

- `apps/*` contains deployable applications and app-specific runtime surfaces,
  including user-facing apps and service backends.
- App-local runtime, deployment, environment, and hosting rules belong at the
  owning app boundary, not in shared packages.

## Rules

- Keep app-specific infrastructure, deploy config, and runtime entrypoints with
  the app that owns them.
- Prefer the Docker Compose sandbox workflow for app development when the task
  touches runtime behavior, environment wiring, multiple app services, or any
  cross-app integration path.
- When working from a git worktree or through subagents, prefer `pnpm sandbox`
  over direct `pnpm dev*` commands. Sandboxes are the preferred workflow there
  because they are the only reliable way to guarantee a clean, isolated app
  instance per workspace.
- Direct `pnpm dev*` workflows remain valid for narrow single-app or package
  loops where sandbox isolation is not needed.
- When wiring Railway app variables to managed services or sibling apps, prefer
  Railway interpolation such as `${{Postgres.DATABASE_URL}}` and
  `https://${{service.RAILWAY_PUBLIC_DOMAIN}}` over hard-coded environment
  URLs.
- Keep secrets, third-party API keys, and sender identities explicit rather
  than deriving them from Railway-provided variables.
- Do not let deployable apps become the canonical owner of shared Postgres
  schema or migration history; that belongs in a shared platform boundary under
  `packages/*`.
- Prefer moving narrower framework or hosting guidance down into the matching
  app-level `AGENTS.md` file.
- Use `@workspace/*` packages for true shared infrastructure and components
  rather than duplicating them inside apps.
- Do not move product feature logic into `packages/*` just because more than one
  app might eventually need it.
