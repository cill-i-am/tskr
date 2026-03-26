# Workspace Membership Architecture Decision

## Goal

Lock the v1 workspace-membership architecture so TSK-21, TSK-22, TSK-23, and
TSK-24 can implement against one stable contract instead of continuing to
branch from the earlier exploratory PRD assumptions.

## Decision Summary

- In v1, product `workspace` maps directly to Better Auth `organization`.
- Better Auth `organization`, `member`, and `invitation` are the canonical
  persistence model for this slice.
- Those tables are defined and migrated in `@workspace/db`, but they belong
  behaviorally to `apps/auth`.
- The Better Auth organization tables should live in the `auth` schema, not the
  `app` schema.
- Do not introduce duplicate custom workspace-membership tables in `app` for
  v1.
- `apps/auth` owns the v1 workspace contract. `apps/api` stays out of scope for
  this slice.

## Why This Decision Exists

The PRD correctly identified the product need, but it left open whether v1
should model workspaces through custom product tables or through Better Auth's
organization system with a thin product wrapper. That ambiguity would now slow
or fragment the next implementation tickets.

We are resolving that ambiguity in favor of Better Auth's existing
organization-plugin model so the first slice ships against one canonical source
of truth for membership, invites, and active-workspace session state.

## Canonical Model

- Product term: `workspace`
- Canonical auth primitive: Better Auth `organization`
- Canonical membership record: Better Auth `member`
- Canonical invite record: Better Auth `invitation`

For v1, the product should treat these Better Auth records as the real system of
record rather than mirroring them into separate app-owned membership tables.
Product-specific behavior may wrap them, but it should not duplicate them.

## Ownership Boundary

- `@workspace/db` owns table definitions, schema registration, and migrations.
- `apps/auth` owns the behavior, integration, and contract exposed to the rest
  of the product for:
  - workspace creation
  - membership reads and changes
  - invite issuance and acceptance
  - active workspace session state
  - auth bootstrap payloads
- `apps/api` is not part of this slice and should not become a second home for
  workspace-membership rules in v1.

This keeps the auth-backed workspace model coherent while still respecting the
monorepo boundary that shared database definitions live in `@workspace/db`.

## Schema Decision

The Better Auth organization-plugin tables for this slice should be created in
the `auth` schema.

They should not be recreated in the `app` schema, and v1 should not add custom
workspace, membership, or invitation tables in `app` that duplicate Better
Auth's organization data model.

## Active Workspace Contract

In v1, `active workspace` is session-scoped via Better Auth
`session.activeOrganizationId`.

This explicitly overrides the earlier PRD expectation that active workspace be
stored remotely and restored across devices. v1 active-workspace state is tied
to the current session, not treated as a cross-device user preference.

That choice is intentional for the first slice:

- it aligns with the Better Auth organization model we are adopting
- it avoids adding a second persistence contract just to remember last workspace
- it keeps recovery logic local to auth/session behavior

## Role Vocabulary

Lock the v1 role vocabulary to:

- `owner`
- `admin`
- `dispatcher`
- `field_worker`

For this slice:

- `owner` and `admin` keep the workspace-management semantics already described
  in the PRD
- `dispatcher` and `field_worker` are member-level roles in the workspace
  membership model

Teams and multi-role invites are out of scope for this slice.

## Auth Bootstrap Contract

The auth bootstrap contract for v1 should include enough state for the web app
to decide whether the user can enter the product, must choose a workspace, or
must return to onboarding.

That bootstrap should cover:

- memberships
- pending invites
- active workspace
- recovery state

`recovery state` here means the result of validating the session's active
workspace against current memberships and deciding whether the session is still
usable as-is, needs an automatic switch, needs explicit user selection, or
requires onboarding.

## Recovery Behavior

When the current session's active workspace is evaluated:

- if the active workspace is still valid, keep it
- if the active workspace is invalid and exactly one membership remains,
  auto-switch for that session
- if the active workspace is invalid and multiple memberships remain, clear the
  active workspace and require explicit selection
- if no memberships remain, onboarding is required

This recovery contract belongs to the auth-owned workspace bootstrap behavior,
not to ad hoc client-only heuristics.

## Invite Model

The v1 invite model is:

- one workspace per invite
- one role per invite
- short code is the canonical human-facing identifier
- signed link wraps the short code

Better Auth `invitation` remains the canonical internal system record. The
short-code wrapper is implemented as auth-owned additional invitation metadata
or fields on top of the Better Auth invitation model, not as a separate
duplicate invite table.

That means v1 should persist the short code and any supporting wrapper metadata
with the auth-owned invitation record shape for this slice, while keeping the
Better Auth invitation as the canonical invite object.

Teams and multi-role invites remain out of scope for this slice.

## Consequences For Follow-On Tickets

TSK-21, TSK-22, TSK-23, and TSK-24 should assume:

- workspace persistence comes from Better Auth organization-plugin tables
- those tables live in the `auth` schema
- `apps/auth` is the slice owner for the v1 workspace contract
- active workspace is session-scoped through
  `session.activeOrganizationId`
- membership and invite UX should consume the auth bootstrap contract rather
  than invent parallel app-owned state

## Implementation Follow-Up

Before implementation work depends on local source mirrors for Better Auth:

- add `better-auth` to `opensrc.packages.json`
- refresh `.opensrc/`

That follow-up is required so implementation work can inspect the mirrored
source before falling back to remote package lookup.
