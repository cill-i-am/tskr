# Web App Intent

Follow the root `AGENTS.md` and `apps/AGENTS.md` first. This node adds guidance
for the deployable web application in this subtree.

## Scope

- `apps/web` is a TanStack Start + Vite + Nitro application.
- Railway deployment and healthcheck behavior live with this app.

## Rules

- Keep route files, handlers, and framework entrypoints thin; push business
  rules into slice-owned code quickly.
- Treat `apps/web/railway.toml` as the source of truth for Railway-specific
  build, start, and healthcheck expectations.
- Preserve the app's runtime entrypoint and healthcheck behavior when changing
  deployment or startup paths.
- Prefer shared primitives from `@workspace/ui` before creating new app-local UI
  building blocks.
- Keep app-specific assets, styles, and route concerns inside `apps/web`
  instead of pushing them down into shared packages.
