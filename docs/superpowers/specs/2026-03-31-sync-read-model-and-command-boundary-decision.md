# Sync Read Model And Command Boundary Decision

## Goal

Lock the collaborative task-state architecture before the `Workspace Sync
Foundation` project fans out into implementation tickets such as TSK-11 through
TSK-18 and before follow-on slices like `Task Core`, `Assignees And Field
Flow`, and `Manual Intake And Review` start building on incompatible client data
assumptions.

## Decision Summary

- Shared collaborative product reads should use a sync-backed client data model.
- Postgres remains the canonical system of record.
- The initial sync foundation should use Electric-backed authenticated sync with
  TanStack DB collections on the client.
- Writes should still cross an app-owned command boundary rather than teaching
  browsers to mutate shared tables directly.
- `apps/api` is the default owner for collaborative task commands, sync proxy
  behavior, and command contracts outside auth-specific slices.
- `apps/auth` remains the owner of identity, session, membership, and
  authorization context, but not the general home for task workflow
  orchestration.
- Effect is a valid implementation tool for command handlers, contracts, and
  local orchestration, but `@effect/rpc` plus client atoms is not the primary
  substrate for collaborative product state.

## Why This Decision Exists

The roadmap now includes multi-actor task coordination, field-worker flows,
workspace connections, AI-assisted intake, search, and channel notifications.
Those slices all benefit from a shared client view of rapidly changing state
that can survive reconnects and update multiple screens without bespoke cache
stitching.

An RPC-only client approach would keep typed request and response contracts, but
it would still leave the product rebuilding the hard parts of collaborative
state distribution by hand: live updates, reconnect behavior, optimistic
coordination, offline drift, and cache invalidation across related screens.

The current roadmap already assumes a sync foundation. This decision locks that
direction so the implementation tickets can build one coherent stack.

## Canonical State Model

- Canonical write store: Postgres
- Canonical collaborative read projection: authenticated synced subsets of
  Postgres data
- Canonical browser collection layer: TanStack DB
- Canonical command boundary: app-owned HTTP or RPC-style mutation contracts

The sync layer is part of how the product reads collaborative state. It is not a
replacement for server-owned business rules or authorization boundaries.

## Ownership Boundary

- `@workspace/db` owns schema definitions, migrations, and database-level sync
  prerequisites for shared tables.
- `apps/api` owns collaborative product commands, mutation orchestration,
  permission checks, and the trusted browser-facing sync proxy or auth-aware
  sync boundary for non-auth slices.
- `apps/auth` owns identity, session, workspace membership, and the auth context
  consumed by other layers.
- `apps/web` owns client composition, UI workflows, and sync-backed collection
  usage in the browser.

This keeps the read model collaborative and reactive without diluting the
server-side ownership of commands and policy.

## Read Model Decision

For collaborative product surfaces, the browser should prefer synced
collections over route-local copies of shared state.

That means:

- list and detail views should read from the shared sync-backed client layer
- related screens should converge through the same synced state instead of
  separate fetch caches
- reconnect and live-update behavior should live in the shared client data
  substrate, not in per-screen custom effects

Not every screen must become sync-backed immediately. The rule is about the
direction of the collaborative product model, not a demand that every read path
switch at once.

## Command Model Decision

Mutations, AI workflows, and side effects should continue to cross a server
boundary.

That includes:

- task creation and mutation workflows
- permission-sensitive changes
- AI-assisted extraction, merge, split, and finalization flows
- notifications and external integrations
- any workflow that needs validation, orchestration, or auditing

When a client mutation needs to reconcile with the synced read model, the
command contract may return domain payloads plus sync confirmation metadata such
as transaction or cursor information.

## CQRS Interpretation

This repo should use a lightweight CQRS interpretation for collaborative
product state.

That means:

- commands and queries have different runtime responsibilities
- command handlers own validation, authorization, orchestration, and side
  effects
- query consumers read from the shared sync-backed model instead of rebuilding
  private fetch caches per screen

It does not mean:

- separate command and query deployables by default
- event sourcing as a prerequisite
- duplicated domain rules across independent read and write backends

The intended split is architectural, not ceremonial. We want clearer ownership
and less accidental coupling, not a second system for its own sake.

## Recommended Slice Shape

Within a feature slice, keep command and query concerns separate in structure
while preserving one domain home for the business rules.

Example:

```text
apps/api/src/domains/tasks/update-task/
  application/
    commands/
      update-task.ts
      update-task-contract.ts
    queries/
      get-task-sync-auth.ts
  domain/
    task-policy.ts
    task-errors.ts
  infra/
    http/
      update-task-route.ts
    sync/
      task-sync-proxy.ts
  index.ts

apps/web/src/domains/tasks/update-task/
  application/
    use-update-task-command.ts
    use-task-collection.ts
  ui/
    task-editor.tsx
  infra/
    commands/
      update-task-client.ts
    sync/
      task-collection.ts
  index.ts
```

Guidance for that shape:

- keep domain invariants in one domain home, not split between command and
  query folders
- put command handlers under `application/commands/*`
- put query-facing sync authorization, shape wiring, or collection adapters
  under `application/queries/*` or `infra/sync/*`, depending on whether the
  code is policy or transport
- keep framework routes and handlers thin in `infra/http/*`
- keep the web app focused on command invocation and synced collection usage,
  not on maintaining a parallel read store

If a slice is small, do not force every subfolder. The important boundary is
clear command ownership plus sync-backed query consumption, not folder ceremony.

## Effect Decision

Effect remains in-bounds as an implementation choice for:

- typed command contracts
- handler composition
- workflow orchestration
- local client orchestration where it is a good fit

However, `@effect/rpc` and atom-driven client state should complement the sync
architecture, not replace it. They are tools for commands and local reactivity,
not the default distributed data model for collaborative task state.

## XState Decision

XState is approved for workflow-heavy slices where the explicit state graph is a
real part of the product behavior, such as intake, review, retry, escalation,
or multi-step recovery flows.

It is not the default client-state layer for the product and should not replace:

- the sync-backed read model for collaborative entities
- ordinary form or CRUD state that is already clear without a machine
- app-owned command handlers and server-side orchestration

Prefer introducing XState one slice at a time when the workflow complexity is
hard to reason about with plain hooks or functions. Keep the shared read model,
command boundary, and domain ownership rules unchanged.

## Why We Are Not Choosing RPC-Only Client State

We are explicitly not standardizing on a pure `@effect/rpc` plus atom-driven
client architecture for collaborative task state because it would make the
product responsible for rebuilding the behaviors the roadmap most needs from the
data layer:

- multi-actor live updates
- resilient reconnect semantics
- local-first or near-local-first interaction patterns
- coherent shared reads across many related screens
- less bespoke client cache invalidation work as the task model grows

Those costs would land early in `Task Core` and compound further in field and
AI-assisted slices.

## Consequences For Follow-On Work

The `Workspace Sync Foundation` project should assume:

- Electric-backed authenticated sync is the read-path foundation
- TanStack DB is the browser collection layer over that synced state
- commands remain app-owned and permission-checked
- `apps/api` is the default home for collaborative product mutations and sync
  proxy behavior
- Effect may help implement commands, but it is not the reason to avoid the
  sync foundation

The first proving slice should keep the scope narrow and real, such as the live
workspace-members reference surface already called out in TSK-18.

## Guardrails

- Do not let browsers write shared collaborative tables directly just because
  the read path is sync-backed.
- Do not put app-specific permission logic or workflow semantics into
  `@workspace/db`.
- Do not treat route loaders or local component state as competing systems of
  record for collaborative entities once a slice has adopted the sync layer.
- Do not move generic task orchestration into `apps/auth` just because auth
  context is required.
