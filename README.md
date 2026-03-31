# shadcn/ui monorepo template

This is a TanStack Start monorepo template with shadcn/ui.

## Local development URLs

This repo uses [Portless](https://github.com/vercel-labs/portless) for app dev
URLs so each app gets a stable local hostname instead of a fixed port.

Install Portless globally:

```bash
npm install -g portless
```

Then start an app from the repo root:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:auth
```

The main checkout runs at:

```text
https://web.tskr.localhost
https://api.tskr.localhost
https://auth.tskr.localhost
```

Linked git worktrees get the branch name as a prefix automatically:

```text
https://<branch>.web.tskr.localhost
https://<branch>.api.tskr.localhost
https://<branch>.auth.tskr.localhost
```

Useful commands:

```bash
portless list
PORTLESS=0 pnpm --filter web run dev
PORTLESS=0 pnpm --filter api run dev
PORTLESS=0 pnpm --filter auth run dev
```

- `portless list` shows the active route registrations.
- `PORTLESS=0 ...` bypasses Portless and runs the app directly.
- App scripts use `portless run --name <service>.tskr ...` so worktrees inherit
  a branch-prefixed hostname automatically.
- Portless is a global prerequisite for this repo, not a workspace dependency.
- This workflow is tested with `portless@0.9.0+` on macOS and Linux.
- Portless now auto-starts its HTTPS proxy on first run; there is no separate
  repo-specific proxy config step.

If Safari cannot resolve the hostname, run:

```bash
sudo portless hosts sync
```

If HTTPS trust fails, fix the Portless proxy/certificate setup first before
debugging the app itself.

If you later add Vite proxy rules between local apps, set `changeOrigin: true`
to avoid Portless proxy loops.

## Sandbox workflow

The repo now includes a Docker Compose sandbox workflow for isolated full-stack
instances. Each sandbox gets its own `web`, `api`, `auth`, and `postgres`
services, plus generated env files under `.sandbox/<name>/`. Local sandboxes
also run the repo-owned `apps/electric` service inside the same sandbox
topology.

Create and inspect a sandbox from the repo root:

```bash
pnpm sandbox create "Feature Review"
pnpm sandbox list
pnpm sandbox urls "Feature Review"
```

Start and stop the local sandbox profile:

```bash
pnpm sandbox start "Feature Review"
pnpm sandbox logs "Feature Review" --service electric
pnpm sandbox stop "Feature Review"
pnpm sandbox destroy "Feature Review"
```

Useful notes:

- Local sandboxes keep Portless at the host level and register static aliases
  like `https://feature-review.web.tskr.localhost`.
- Local sandbox env generation now includes
  `.sandbox/<name>/local/electric.env` alongside the existing app env files.
- Electric runs only in the local sandbox profile for now and uses
  `apps/electric/Dockerfile` plus the sandbox Postgres service with logical
  replication enabled.
- Hosted sandboxes use the hosted Compose overlay plus the generated domain
  values in `.sandbox/<name>/hosted/compose.env`.
- The local sandbox workflow still expects Docker and a global `portless`
  install.
- Direct `pnpm dev*` workflows remain supported and unchanged for non-sandbox
  work.

## Root workflow

Run workspace checks from the repo root:

```bash
pnpm check
pnpm typecheck
pnpm build
pnpm fix
```

Package-level checks run through Turbo from these root commands. `pnpm fix`
still runs Ultracite first and then a final Oxfmt write pass so the command
stays idempotent even when Oxlint autofixes leave formatting behind. The root
Oxfmt config also owns import ordering and Tailwind class sorting for the repo.
Generated router output in `apps/web/src/routeTree.gen.ts` and the local
`.agents/` skill content are intentionally excluded from the root lint/format
pass.

`pnpm ultracite doctor` currently passes in this repo with `@biomejs/biome` installed, but its remaining warnings are expected for this migration: there is no `biome.json(c)` and no `eslint.config.*` because the repo uses Oxfmt and Oxlint directly at the root.

## Local API/Auth + Postgres workflow

`api` and `auth` now use the shared local Postgres launcher. Their dev flows
ensure Docker Postgres is up and pass the computed per-worktree `DATABASE_URL`
into the app process.

From the repo root:

```bash
pnpm dev
```

This runs the workspace dev tasks through Turbo and starts all apps. Default app
URLs are:

- `web`: Portless-managed URL (`https://web.tskr.localhost`)
- `api`: Portless-managed URL (`https://api.tskr.localhost`)
- `auth`: Portless-managed URL (`https://auth.tskr.localhost`)

`api` and `auth` respect `process.env.PORT` (including in Turbo-driven `pnpm dev`
via package `turbo.json` env passthrough). Because `PORT` is shared, setting it
while running both services at once will make them contend for the same port.
Use filtered dev commands when overriding a single service port.

With `PORTLESS=0`, `api` and `auth` bypass Portless and bind directly to their
default local ports:

- `api`: `http://localhost:3001`
- `auth`: `http://localhost:3002`

To run one backend app directly:

```bash
pnpm --filter api run dev
pnpm --filter auth run dev
```

Useful local database helpers:

```bash
pnpm db:ensure
pnpm db:url
pnpm db:logs
pnpm db:reset
pnpm db:down
pnpm --filter api run db:ensure
pnpm --filter auth run db:ensure
```

### Auth environment variables

The `auth` service uses Better Auth with Postgres through the Drizzle adapter.

Prefer Railway interpolation for service URLs and managed database wiring so
production domains stay aligned with the current environment without manual
copying. Keep secrets and sender identities explicit.

Required in Railway for `api`:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`

Required in Railway for `auth`:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `BETTER_AUTH_SECRET=<generated secret>`
- `BETTER_AUTH_URL=https://${{auth.RAILWAY_PUBLIC_DOMAIN}}`
- `BETTER_AUTH_TRUSTED_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}` (or a comma-separated list if multiple browser origins are allowed)
- `WEB_BASE_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}`
- `EMAIL_FROM=<display name and sender, e.g. TSKR <noreply@your-domain>>`
- `EMAIL_PROVIDER=resend` (recommended in production; defaults to `resend` in production when unset)
- `RESEND_API_KEY=<resend api key>` (required whenever `EMAIL_PROVIDER` resolves to `resend`)
- `EMAIL_REPLY_TO=<optional support mailbox>`

Recommended in Railway for `web`:

- `VITE_AUTH_BASE_URL=https://${{auth.RAILWAY_PUBLIC_DOMAIN}}` (optional explicit override; the app also falls back to `RAILWAY_SERVICE_AUTH_URL` during server rendering)

Required in GitHub Actions for shared production migrations:

- `DATABASE_URL=<Railway Postgres connection string>`

Useful local defaults:

- `BETTER_AUTH_URL=https://auth.tskr.localhost`
- `BETTER_AUTH_TRUSTED_ORIGINS=https://web.tskr.localhost,http://localhost:3000,http://localhost:5173`
- `WEB_BASE_URL=https://web.tskr.localhost` (or `http://localhost:3000` with `PORTLESS=0`)
- `EMAIL_FROM=TSKR <noreply@localhost>`
- `EMAIL_PROVIDER=console` (default outside production)
- `EMAIL_REPLY_TO=support@localhost` (optional)
- `VITE_AUTH_BASE_URL=https://auth.tskr.localhost`

For Resend-backed delivery, verify your sender domain in Resend first, then set
`EMAIL_FROM` to a verified sender and provide `RESEND_API_KEY`. If you only need
local development behavior, leave `EMAIL_PROVIDER` unset and auth will default
to the console transport outside production.

If running direct local development without Portless, the auth service falls back
to `http://localhost:3002`.

### Production migrations

Shared schema migrations now live in `@workspace/db` and run outside the app
services. Use:

```bash
pnpm db:generate
pnpm db:migrate
```

`auth` and `api` both consume the shared package, but neither Railway service
owns production migrations anymore. The production migration runner is the
GitHub Actions workflow in `.github/workflows/db-migrate.yml`, which applies the
single Drizzle migration history against the shared Railway Postgres database.

## Local source mirrors

- Run `pnpm bootstrap` to install workspace dependencies and any local project prerequisites.
- Run `pnpm opensrc:sync` to refresh the local dependency source mirrors in `.opensrc/`.
- Use `.opensrc/sources.json` as the index for those mirrors before looking up package sources elsewhere.
- Follow the `path` values in `.opensrc/sources.json` to inspect the mirrored package source under `.opensrc/`.

`pnpm setup` is a pnpm built-in command, so this repo uses `pnpm bootstrap` as the onboarding entrypoint.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

`@workspace/ui` is currently consumed as shared source instead of a built
package.

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```

The intended direction is a real built package with a stable package boundary.
