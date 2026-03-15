# Railway Monorepo Deployment Design

## Goal

Prepare this Turborepo-based TanStack Start monorepo for Railway so the current `web` app can deploy cleanly now and future services such as `auth`, `api`, sync infrastructure, Postgres, and Redis can fit the same deployment model without reworking the repository structure.

## Current State

- The repo is a shared pnpm/Turborepo workspace with apps in `apps/*` and shared packages in `packages/*`.
- The current deployable app is `apps/web`.
- `apps/web` already uses Nitro through `nitro()` in `apps/web/vite.config.ts` and currently builds to `.output/server/index.mjs` with Nitro's `node-server` preset.
- `apps/web/package.json` has a `build` script but no production `start` script.
- `turbo.json` defines `build`, `check`, `typecheck`, and `dev`, but does not define a reusable `start` task.
- The app does not currently expose a dedicated healthcheck endpoint for Railway.

## Constraints

- Railway should treat this repository as a shared monorepo, not as an isolated single-app repo.
- Deployment must preserve access to workspace-level config, shared packages, and future internal libraries.
- The deployment pattern should scale to multiple Railway services in one Railway project.
- The solution should align with TanStack Start's Nitro hosting guidance and the local `use-railway` skill guidance for shared monorepos.

## Decision

Use a shared-monorepo Railway deployment model rooted at the repository root.

Each Railway service will keep full repo context and use explicit build and start commands scoped to a package or app instead of using Railway `rootDirectory` for shared-code services.

For the current `web` service, Railway should build from the repo root and run package-scoped commands that target `apps/web`.

## Rejected Approaches

### Per-service `rootDirectory`

This is fine for isolated monorepos, but it becomes fragile once `web`, `auth`, and `api` import shared workspace packages. Restricting the source tree to `apps/web` would hide repo-root config and sibling packages that shared builds need.

### Docker-first deployment

This would work, but it adds container maintenance too early. Railpack is sufficient for the current Node/Nitro setup, and the repo does not yet need custom image logic.

## Architecture

### Railway project layout

Use one Railway project for the product and create separate services inside it.

Planned service categories:

- `web` for the TanStack Start frontend and SSR runtime
- `auth` for Better Auth or auth API concerns
- `api` for application APIs
- managed `Postgres`
- managed `Redis` if needed
- future sync infrastructure such as Electric SQL or a dedicated sync service

This keeps infrastructure grouped while allowing independent deploys, variables, logs, and domains per service.

### Build and runtime model

Each deployable app in the monorepo should expose package-local scripts for:

- `build`
- `start`

The root workspace should continue to delegate build orchestration through Turborepo.

Railway service commands should use the repo root and scope the action to the service package. For `web`, the target pattern is:

- build command: `pnpm exec turbo run build --filter=web`
- start command: `pnpm --filter web start`

This keeps Railway aligned with the monorepo graph while avoiding a global start command that tries to boot unrelated services. Runtime execution should use filtered pnpm package scripts directly, not `turbo run start`, because Railway needs one concrete long-running process for the selected service.

### Web runtime model

The `web` app should run Nitro directly in production using the built output:

- build: `vite build`
- start: `node .output/server/index.mjs`

That runtime should be exposed through an app-local `start` script in `apps/web/package.json` so Railway can invoke a stable command through pnpm filtering.

### Turbo task model

Keep Turbo focused on build, check, typecheck, and dev orchestration.

Do not add a deployment-facing root `start` task at this stage. The deploy model for Railway should remain:

- build through Turbo from the repo root
- start through filtered package scripts

That keeps the production runtime explicit and avoids an unnecessary second abstraction for long-running service boot.

### Healthcheck model

Add a lightweight server route in the TanStack Start app for Railway health checks.

Preferred path:

- `/up`

Acceptable alternative:

- `/health`

The route should be implemented as a TanStack Start server file route and return a simple successful response such as HTTP 200 with a small JSON body.

Initial response shape can be minimal, for example:

```json
{ "ok": true }
```

The endpoint should avoid database or downstream dependency checks in the first version. Its purpose is process liveness for Railway deployment health, not deep readiness.

## Networking Model

### Browser to backend

Frontend code in the browser cannot use Railway private networking. Any browser-facing `web` to `auth` or `api` traffic must go through public domains.

### Service to service

Internal server-side communication between Railway services should use `RAILWAY_PRIVATE_DOMAIN` and private networking.

Examples:

- `auth` to `Postgres`
- `api` to `Postgres`
- `api` to `Redis`
- future sync services to internal dependencies

### Database access

Managed database services should be wired to server-side services through Railway variable interpolation such as `${{Postgres.DATABASE_URL}}`.

The `web` service should only receive direct database credentials if it truly owns server-side database access. If the browser needs data, it should reach a public API route, not a private database endpoint.

## Railway Configuration Strategy

### Builder

Use Railpack as the default Railway builder.

### Source layout

Do not set `source.rootDirectory` for shared-code services in this repo.

### Service commands

For `web`, configure Railway service settings roughly as:

- config file path: `/apps/web/railway.toml`
- builder: `RAILPACK`
- build command: `pnpm exec turbo run build --filter=web`
- start command: `pnpm --filter web start`

Railway does not auto-discover subpath service manifests by default, so the `web`
service must be explicitly configured to use `/apps/web/railway.toml` as its
config file path.

When `auth` and `api` are added, they should follow the same pattern with their own package names.

### Watch patterns

As more services are added, Railway `watchPatterns` should be set so a service only redeploys when its own app or shared dependencies change.

For `web`, the initial concrete set should include:

- `apps/web/**`
- `packages/ui/**`
- `apps/web/package.json`
- `packages/ui/package.json`
- `apps/web/vite.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.json`

This set can be refined later, but the first version should be concrete enough to prevent obvious missed rebuilds.

## Required Repository Changes

### `apps/web/package.json`

Add a production `start` script that runs Nitro's server entry.

Expected script:

```json
{
  "start": "node .output/server/index.mjs"
}
```

This gives Railway a stable package-level runtime entrypoint.

### `apps/web/src/routes`

Add a server route for health checks, preferably `/up`.

The route should return a fast HTTP 200 response with a minimal body and no downstream dependency checks.

### Optional root scripts

No service-specific build or start logic should be added to the root `package.json` beyond Turbo delegation. The repo should keep package logic inside each deployable package.

## Error Handling And Operational Expectations

### Build failures

If Railway fails to build the service, first check:

- package manager detection
- build command correctness
- shared workspace visibility
- Node version pinning if Railway detects the wrong version

### Runtime failures

If the service builds but crashes, first check:

- `pnpm --filter web start` resolves correctly
- `node .output/server/index.mjs` exists after build
- the app binds to Railway's injected `PORT`
- required runtime variables are present
- the healthcheck endpoint responds successfully

### Monorepo regressions

If unrelated changes trigger web redeploys, tighten Railway `watchPatterns` rather than adding `rootDirectory`.

## Verification Plan

### Local verification

Before Railway configuration:

1. Run `pnpm exec turbo run build --filter=web` from the repo root.
2. Run `pnpm --filter web start` from the repo root.
3. Confirm the Nitro server starts from `.output/server/index.mjs`.
4. Confirm `GET /up` returns HTTP 200.

### Railway verification

After configuring the Railway service:

1. Trigger a deploy for the `web` service.
2. Confirm the build uses the scoped monorepo command.
3. Confirm the deployment becomes healthy.
4. Confirm the generated Railway domain serves the app.
5. Confirm logs show the service listening successfully on the provided port.
6. Confirm Railway health checks pass against `/up`.

## Testing Strategy

- Add the deployment-oriented script changes first.
- Add the healthcheck route as part of the first deployment slice.
- Verify local build and start commands work before touching Railway settings.
- Run the repo's required formatting and linting workflow after editing config.
- Keep the first Railway rollout focused on `web`; use the same pattern for `auth` and `api` once those packages exist.

## Implementation Sequence

1. Add `start` to `apps/web/package.json`.
2. Add `/up` healthcheck route to the TanStack Start app.
3. Verify local `build`, `start`, and healthcheck flows for `web`.
4. Configure the Railway `web` service to use repo-root shared-monorepo commands and `/up` as the healthcheck path.
5. Deploy and validate.
6. Reuse the same service template for future `auth` and `api` services.

## Notes For Future Services

- `auth` and `api` should each be separate Railway services.
- Both should prefer private networking for internal dependencies.
- Public domains should be added only where browser or third-party traffic needs them.
- Postgres and Redis should be provisioned once and shared through Railway variable references.
- If Electric SQL is introduced, decide whether it belongs as its own deployable service or as part of another backend service based on its operational needs.
