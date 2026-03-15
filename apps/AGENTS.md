# Apps Intent

Follow the root `AGENTS.md` first. This node adds guidance for deployable
applications under `apps/*`.

## Scope

- `apps/*` contains end-user applications and app-specific runtime surfaces.
- App-local runtime, deployment, environment, and hosting rules belong at the
  owning app boundary, not in shared packages.

## Rules

- Keep app-specific infrastructure, deploy config, and runtime entrypoints with
  the app that owns them.
- Prefer moving narrower framework or hosting guidance down into the matching
  app-level `AGENTS.md` file.
- Use `@workspace/*` packages for true shared infrastructure and components
  rather than duplicating them inside apps.
- Do not move product feature logic into `packages/*` just because more than one
  app might eventually need it.
