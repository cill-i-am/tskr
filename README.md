# shadcn/ui monorepo template

This is a TanStack Start monorepo template with shadcn/ui.

## Local development URLs

This repo uses [Portless](https://github.com/vercel-labs/portless) for app dev
URLs so each app gets a stable local hostname instead of a fixed port.

Install Portless globally:

```bash
npm install -g portless
```

Enable HTTPS once on your machine:

```bash
portless proxy start --https
```

Then start an app from the repo root:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:auth
```

The main checkout runs at:

```text
https://web.tskr.localhost:1355
https://api.tskr.localhost:1355
https://auth.tskr.localhost:1355
```

Linked git worktrees get the branch name as a prefix automatically:

```text
https://<branch>.web.tskr.localhost:1355
https://<branch>.api.tskr.localhost:1355
https://<branch>.auth.tskr.localhost:1355
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
- App scripts use `portless --name <service>.tskr ...` so worktrees inherit
  a branch-prefixed hostname automatically.
- Portless is a global prerequisite for this repo, not a workspace dependency.
- This workflow is tested with `portless@0.5.2+` on macOS and Linux.

If Safari cannot resolve the hostname, run:

```bash
sudo portless hosts sync
```

If HTTPS trust fails, fix the Portless proxy/certificate setup first before
debugging the app itself.

If you later add Vite proxy rules between local apps, set `changeOrigin: true`
to avoid Portless proxy loops.

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
