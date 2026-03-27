# UI Package Intent

Follow the root `AGENTS.md` and `packages/AGENTS.md` first. This node adds
guidance for the shared UI package in this subtree.

## Scope

- `packages/ui` is the shared design-system and UI primitives package.
- This package owns reusable components, shared styling primitives, and its own
  build and export surface.

## Rules

- Keep this package focused on reusable UI primitives, helpers, and shared
  styles rather than app-specific screens or workflows.
- Preserve the package's explicit export surface when adding or moving modules.
- Treat package build config and generated outputs as package-local concerns.
- Keep shared styling conventions aligned with `components.json` and
  `src/styles/globals.css`.
- When adding components, prefer patterns that are reusable across apps rather
  than tuned only for `apps/web`.
- Shared form adapters may live here when they are presentation-focused and
  reused across auth and workspace flows.
- Do not move TanStack form setup, Zod schemas, submit handlers, route
  behavior, or product-specific server error mapping into this package.
