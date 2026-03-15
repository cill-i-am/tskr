# UI Package TSDown Migration Design

## Goal

Turn `@workspace/ui` into a self-contained built package that emits real JavaScript, declaration files, and a stable CSS entry, while preserving fast local development for `apps/web` through automatic rebuild propagation.

## Current State

`packages/ui` is still a source-shared workspace package.

- `apps/web` imports components from `@workspace/ui/components/button`, but TypeScript resolves that import through a path alias to `../../packages/ui/src/*` in `apps/web/tsconfig.json`.
- `apps/web` imports package CSS from `@workspace/ui/globals.css?url`.
- `packages/ui` exports source files directly from `package.json`.
- `packages/ui/src/styles/globals.css` scans app files with `@source ../../../apps/**/*.{ts,tsx}` and is therefore not self-contained.
- `packages/ui` does not have a build script or emitted output, so Turbo cannot treat it as a real upstream library.

This works as a starter, but it blurs the package boundary. The app can succeed while the package itself would fail as a published library.

## Desired Outcome

After this migration:

- `@workspace/ui` builds to `dist/` with `tsdown`.
- `@workspace/ui` publishes ESM JavaScript and `.d.ts` files.
- `@workspace/ui` exposes a stable CSS asset entry.
- `apps/web` consumes only package exports, not `packages/ui/src/*`.
- changes in `packages/ui` propagate automatically to `apps/web` during development through watch mode and Turbo orchestration.
- verification includes both package-boundary checks and a development propagation check.

## Constraints

- Output target: ESM + `.d.ts`.
- Keep the initial package surface small and explicit.
- Prefer real package correctness over dev-only shortcuts.
- Avoid dev-time source linking unless watch-mode DX proves insufficient.
- Keep the migration scoped to `packages/ui`, its consumers, and the Turbo/dev flow needed to support it.

## Options Considered

### 1. Built package only

`apps/web` always consumes the built outputs from `@workspace/ui`, in development and production.

Pros:

- strongest package-boundary validation
- catches missing exports, missing declarations, and CSS packaging mistakes immediately
- simplest mental model

Cons:

- requires watch-mode orchestration for good local DX
- initial setup is a little heavier

### 2. Source in dev, built package in build/publish

The app keeps consuming source during development and switches to built outputs only for production workflows.

Pros:

- easiest migration path

Cons:

- weakest package-boundary safety
- easy for source-only behavior to drift from the published package

### 3. Hybrid via `devExports`

Use tsdown's `exports.devExports` support to expose source during development and built outputs during publish.

Pros:

- better dev ergonomics than a pure built-only model
- keeps an explicit package export story

Cons:

- more export-condition complexity
- higher risk of dev/prod surface mismatch
- pnpm publish behavior is friendlier here than npm, but it still adds another moving part

## Decision

Use option 1 as the baseline architecture: `apps/web` consumes only built `@workspace/ui` outputs.

Keep option 3 as a fallback if the watch workflow proves too clunky. Do not make `devExports` part of the first implementation. The first version should prove the real package works end to end.

## Package Design

### Build tool

Use `tsdown` in `packages/ui`.

The build should:

- emit ESM output
- emit declaration files
- write outputs to `dist/`
- keep dependencies external rather than bundling them into the library
- emit or preserve a stable CSS artifact that can be imported by consumers

The package should use an explicit `tsdown.config.ts` rather than relying on implicit defaults. That keeps the output contract obvious.

### Public entrypoints

Define a small, explicit public surface for the first built version.

Required entrypoints:

- `@workspace/ui` -> root JS entry from `src/index.ts`
- `@workspace/ui/components/button` -> compatibility subpath for the current button import shape
- `@workspace/ui/globals.css` -> stable built CSS asset entry

The first migration will preserve `@workspace/ui/components/button` so `apps/web` can move onto the built package without taking an unrelated import-shape change at the same time.

The root `@workspace/ui` entry should also exist, but it is additive in the first migration. Consumers do not need to switch to it immediately.

No wildcard source-glob exports should remain. Every exported subpath should point at a real built artifact in `dist/`.

### Internal imports

Inside `packages/ui`, code should stop importing from its own published alias.

Current example:

- `packages/ui/src/components/button.tsx` imports `cn` from `@workspace/ui/lib/utils`

That should become a relative import. Internal code should use package-local paths; published aliases are for consumers.

### CSS model

The CSS story needs to split into two concerns.

Package-owned CSS:

- design tokens
- component styles
- package-owned font imports, if those remain part of the package contract

App-owned scanning:

- Tailwind scanning of app routes and app-only components

`packages/ui/src/styles/globals.css` must stop scanning `apps/web` or any future app with `@source` directives. A reusable package cannot depend on the consumer's source tree layout.

The target CSS contract is:

- package CSS remains importable from `@workspace/ui/globals.css`
- the web app continues to consume it as an asset URL with `@workspace/ui/globals.css?url`
- support for side-effect CSS imports is optional in the first migration and should not be part of the required contract
- app Tailwind scanning moves into the app's own stylesheet or config path
- UI package CSS only scans UI package sources

The first implementation should preserve the current route-head integration pattern in `apps/web`, because that is already how the app mounts package CSS.

### Font ownership

Font selection should move out of the UI package for this migration.

The package should not keep forcing Geist as part of its CSS contract. That removes an avoidable asset-packaging complication and makes the UI package easier to reuse. If the app still wants Geist, it can own that choice at the app layer.

### Dependency model

Move `react` and `react-dom` to peer dependencies in `packages/ui`.

The dependency contract for the first built version is:

Peer dependencies:

- `react`
- `react-dom`

Runtime dependencies:

- `@base-ui/react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`

Build-only dependencies:

- `tsdown`
- `typescript`
- Tailwind/CSS build dependencies needed to compile the package stylesheet

These packages should be removed from `packages/ui` unless implementation proves an exported component still needs them:

- `@tailwindcss/vite`
- `@turbo/gen`
- `lucide-react`
- `zod`
- `shadcn`
- `@fontsource-variable/geist`

This migration should not leave dependency ownership vague. The point is to make the package boundary explicit.

## Consumer Changes

### Web app imports

`apps/web` should stop mapping `@workspace/ui/*` to `../../packages/ui/src/*`.

That means:

- remove the UI source path alias from `apps/web/tsconfig.json`
- ensure all current imports resolve through real package exports
- keep `@/*` for app-local code

Current imports that must still work after migration:

- `@workspace/ui/globals.css?url`
- `@workspace/ui/components/button`

The first migration should preserve the current component subpath shape. Import simplification can happen later if desired.

### Build graph

Once `packages/ui` is a real built package, the repo can restore a normal Turbo dependency graph:

- `packages/ui#build` becomes real
- `web#build` can depend on `^build`
- the temporary transit-only workaround from the previous Turbo hardening pass can be removed or simplified

## Development Propagation

This is a core requirement.

Changes made in `packages/ui` must automatically reach `apps/web` during development.

The default development model should be:

- `packages/ui#dev` runs `tsdown --watch`
- `packages/ui#build` runs a one-shot `tsdown`
- `web#dev` runs Vite
- Turbo orchestrates both so the UI package rebuilds when its source changes and the web app sees new artifacts

This is the simplest way to keep the app consuming real package outputs without losing local iteration speed.

If needed, Turbo package configuration can make `ui#dev` persistent and ensure `web#dev` runs alongside it.

## Verification Strategy

### Package correctness

The migration is not done unless all of these work:

- `packages/ui` builds successfully to `dist/`
- emitted `.d.ts` files are present and resolve correctly
- `packages/ui` typechecks cleanly
- `apps/web` typechecks cleanly without a UI source alias
- `apps/web` builds successfully against the built package

### Packed artifact correctness

Workspace-only verification is not enough for this migration.

Required package checks must include a packed-artifact pass, at minimum:

1. create a package tarball from `packages/ui`
2. inspect the tarball contents for built JS, `.d.ts`, CSS, and `package.json`
3. validate that the packed artifact exposes the expected export map and does not depend on missing files

If practical during implementation, add a package validation tool such as `publint` against the packed artifact. The goal is to catch export-map mistakes, bad `files` configuration, or undeclared runtime dependencies before treating the migration as done.

### Propagation correctness

The migration is also not done unless local UI edits propagate automatically.

Required verification flow:

1. run the UI package watch process and the web dev process together
2. change a visible UI component in `packages/ui`
3. confirm the web app picks up the new build output without manual relinking or restarting the package build

### Browser-driven verification

A browser-controlled smoke check should be part of acceptance, even if the exact browser tooling is chosen later.

The purpose is narrow:

- confirm the web app renders a UI-package component
- confirm a change in the UI package shows up in the running app

The specific browser runner can be decided during implementation. It does not change the package architecture.

## Non-Goals

- publishing `@workspace/ui` to npm in this task
- supporting CJS output in the first version
- creating a broad design system extraction beyond the existing package contents
- solving every Base UI build warning unless they block the package build

## Risks

### CSS ownership drift

The current stylesheet mixes package concerns and app concerns. Untangling that may expose assumptions about where Tailwind scanning happens.

Mitigation: treat CSS separation as a deliberate step, not a side effect.

### Export churn

Consumers may currently rely on path shapes that mirror `src/`. Changing exports too aggressively can create migration noise.

Mitigation: preserve existing import shapes when reasonable, then simplify later if desired.

### Watch-mode ergonomics

A built-only development model is correct, but it adds another long-running process.

Mitigation: wire it into Turbo dev orchestration so consumers do not have to manage the package watcher manually.

## Implementation Summary

The first implementation should do five things:

1. make `packages/ui` buildable with `tsdown`
2. make its CSS self-contained
3. move consumers onto real package exports
4. restore a truthful Turbo build/dev graph around the built package
5. verify automatic propagation from UI package changes into the running web app
