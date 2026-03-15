# Domain-Driven Feature Slices

This repo organizes product code by domain and feature slice so an entire
vertical slice can be delivered without scattering behavior across unrelated
folders.

## Core Model

- A feature slice is one coherent product capability, not one UI screen, one
  API route, or one deployable service.
- A slice may span `apps/web`, `apps/auth`, and `apps/api` when the behavior
  requires frontend, auth, and backend changes.
- The default shape is domain first, then slice, then the local implementation
  details for that app.
- Keep framework files thin and push feature behavior into slice-owned modules
  quickly.

## Repo Boundaries

- `apps/web` owns presentation, page composition, client interactions, and
  server-rendered web entrypoints.
- `apps/auth` owns authentication, session, identity, membership, and
  authorization workflows when that app is introduced.
- `apps/api` owns application APIs, orchestration, and backend-facing adapters
  when that app is introduced.
- `packages/ui` is valid shared infrastructure because it is design-system code,
  not domain behavior.
- `packages/*` should not become a dumping ground for feature code. Use shared
  packages for cross-cutting infrastructure or stable shared contracts only.

## Slice Layout

The default home for new product work is:

```text
apps/<app>/src/domains/<domain>/<slice>/
```

A slice should usually own most or all of these concerns inside its folder:

- `ui/` for slice-specific components and presentation logic
- `application/` for use cases, commands, queries, and orchestration
- `domain/` for core rules, policies, entities, and invariants
- `infra/` for persistence, HTTP clients, auth adapters, and external systems
- `index.ts` for the slice's public entrypoint inside that app
- colocated tests close to the behavior they verify

An example feature that spans multiple apps:

```text
apps/web/src/domains/tasks/create-task/
apps/api/src/domains/tasks/create-task/
apps/auth/src/domains/tasks/create-task/
```

Use the same domain and slice names across apps when they refer to the same
capability. That keeps ownership obvious and makes feature plans easier to write
and execute end-to-end.

Not every feature needs all three apps. If a slice only needs `web` and `api`,
keep it in those apps and do not invent an `auth` slice for symmetry.

## Thin Entrypoints

- TanStack Start route files in `apps/web/src/routes/*` should stay thin and
  delegate into slice-owned code.
- Future auth handlers and API transport handlers should do the same. They are
  entrypoints, not the place to accumulate domain rules.
- Cross-slice calls should go through explicit public entrypoints rather than
  deep imports into another slice's internal folders.

## Auth And API Expectations

- Treat auth as part of the architecture, not an afterthought. If a feature
  needs identity checks, session data, org membership, or permission rules,
  model that explicitly in the slice.
- API handlers should expose slice-oriented use cases and contracts. They should
  not become a second place where the same business rules are rewritten.
- Keep domain rules in one clear home. Other layers should consume those rules
  through interfaces, contracts, or app-specific adapters instead of duplicating
  them.

## Delivery Rules

- Write and implement feature plans as vertical slices, even when the work spans
  multiple apps.
- Group related `web`, `auth`, and `api` changes under one domain capability
  instead of splitting the work into disconnected layer-first tasks.
- Only extract code to shared packages after a real second consumer or a clear
  platform boundary exists.

## Fit With Current Repo

- The current repo already has thin app-level framework folders such as
  `apps/web/src/routes` and cross-cutting infrastructure such as `packages/ui`.
- The Railway deployment design already anticipates separate `web`, `auth`, and
  `api` services. This architecture guidance aligns with that future service
  split without requiring those apps to exist yet.
- Existing cross-cutting utilities such as `apps/web/src/lib` are acceptable for
  technical helpers, but new feature behavior should prefer slice-owned modules
  under `src/domains`.
