# shadcn/ui monorepo template

This is a TanStack Start monorepo template with shadcn/ui.

## Code quality commands

Use the root Ultracite workflow for linting and formatting:

```bash
pnpm check
pnpm fix
pnpm ultracite doctor
```

`pnpm fix` runs Ultracite first and then a final Oxfmt write pass so the command stays idempotent even when Oxlint autofixes leave formatting behind. The root Oxfmt config also owns import ordering and Tailwind class sorting for the repo. Generated router output in `apps/web/src/routeTree.gen.ts` and the local `.agents/` skill content are intentionally excluded from the root lint/format pass.

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

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```
