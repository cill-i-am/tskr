# Web App Intent

Follow the root `AGENTS.md` and `apps/AGENTS.md` first. This node adds guidance
for the deployable web application in this subtree.

## Scope

- `apps/web` is a TanStack Start + Vite + Nitro application.
- Railway deployment and healthcheck behavior live with this app.

## Rules

- Keep route files, handlers, and framework entrypoints thin; push business
  rules into slice-owned code quickly.
- Treat sync-backed client collections and queries as the default source for
  collaborative read state once a slice adopts the shared sync foundation.
- Treat `apps/web/railway.toml` as the source of truth for Railway-specific
  build, start, and healthcheck expectations.
- Preserve the app's runtime entrypoint and healthcheck behavior when changing
  deployment or startup paths.
- Prefer `https://${{auth.RAILWAY_PUBLIC_DOMAIN}}` when setting an explicit
  Railway auth base URL for this app, and preserve the existing
  `RAILWAY_SERVICE_AUTH_URL` server-side fallback when touching runtime config.
- Keep mutations, AI-triggered workflows, and other side effects behind
  app-owned command calls; let the sync layer refresh collaborative state
  instead of stitching ad hoc client caches per screen.
- Keep offline, reconnect, and live-update semantics in the shared client data
  layer rather than reimplementing them inside individual routes or components.
- Prefer shared primitives from `@workspace/ui` before creating new app-local UI
  building blocks.
- Keep app-specific assets, styles, and route concerns inside `apps/web`
  instead of pushing them down into shared packages.
