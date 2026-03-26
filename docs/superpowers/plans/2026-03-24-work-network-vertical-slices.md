# Work Network Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the new multi-workspace work-network product as a sequence of end-to-end vertical slices that each ship usable software across `web`, `auth`, `api`, and shared packages where justified.

**Architecture:** Follow the repo's domain-driven feature slice model. Each capability should be planned and implemented as a vertical slice with matched names across apps where needed, thin framework entrypoints, and business logic owned by slice modules rather than route handlers or shared dumping-ground packages. This document stays at roadmap granularity; exact files, tests, and micro-steps belong in the PRD and implementation-plan docs for each slice.

**Tech Stack:** TanStack Start, Hono, Better Auth, Better Auth UI investigation, pnpm workspaces, Turborepo, TypeScript, Drizzle, Postgres, Effect, ElectricSQL investigation, TanStack DB investigation, TanStack Form, shadcn/ui form integration, workspace-scoped RBAC, AI-assisted intake, pluggable notification/channel adapters

---

## Planning Level

- This document is intentionally less granular than a per-slice PRD.
- It should answer:
  - what ships in each vertical slice
  - which apps/packages each slice touches
  - what each slice depends on
  - what later slices it unlocks or blocks
- It should not try to lock every concrete file and 2-5 minute step yet.
- Do that in the PRD and implementation plan for each accepted slice.

## Scope And Sequencing Rules

- This plan is intentionally slice-first, not layer-first.
- Each chunk should produce software that is testable and demonstrably useful on its own.
- Do not start a later chunk until its blocking dependencies are either complete or deliberately stubbed behind a clear interface.
- Keep the product vocabulary stable. Working terms:
  - `workspace`
  - `assignee`
  - `task`
  - `work request`
  - `coordination state`
- Keep edge cases in a separate living document: [docs/superpowers/specs/2026-03-24-work-network-edge-cases.md](/Users/cillianbarron/Documents/Development/tskr/docs/superpowers/specs/2026-03-24-work-network-edge-cases.md)
- Do not let edge-case analysis silently expand the MVP.

## Dependency Graph

1. `workspace-membership-and-settings` blocks nearly everything else.
2. `task-core` depends on `workspace-membership-and-settings`.
3. `assignees-and-field-flow` depends on `task-core`.
4. `manual-intake-and-review` depends on `task-core`.
5. `workspace-connections-and-work-requests` depends on `task-core` and `workspace-membership-and-settings`.
6. `search-and-visibility` depends on `task-core`, then expands once `manual-intake-and-review` and `workspace-connections-and-work-requests` exist.
7. `whatsapp-notifications` depends on `assignees-and-field-flow` and `workspace-membership-and-settings`.

## Shared Blockers To Resolve Early

- Better Auth organization plugin ownership:
  - confirm whether organization membership lives fully in Better Auth plugin-managed tables
  - decide how that schema integrates with `@workspace/db` migration ownership
- Better Auth UI:
  - investigate [better-auth-ui.com](https://better-auth-ui.com/) as an accelerator for workspace/auth surfaces
  - if useful, pull code or patterns early rather than hand-rolling everything
- Attachment storage:
  - choose object storage and access pattern before task attachments ship
- Search implementation path:
  - decide whether v1 uses Postgres-native search only or an external index later
- Form architecture:
  - define a standard TanStack Form + shadcn/ui integration pattern before settings, task composer, and intake forms diverge
- Local-first or sync stack investigations:
  - decide whether ElectricSQL and TanStack DB are v1 commitments or post-MVP experiments
- Effect usage:
  - decide whether new server-side slices should adopt Effect as a hard architectural boundary or whether it remains an optional later refinement
- WhatsApp delivery provider:
  - prove the v1 outbound-only notification path before the notification slice starts

## Demo Loop And Deferred Expansion

- The first demoable end-to-end product loop is:
  - `Workspace Membership And Settings`
  - `Task Core`
  - `Manual Intake And Review`
- Those three slices are sufficient to demonstrate:
  - workspace-scoped onboarding and access
  - core task creation and rendering
  - human-in-the-loop AI intake that turns messy text into real tasks
- The following slices are explicitly deferred expansion layers after the first
  demo loop proves itself:
  - `Assignees And Field Flow`
  - `Workspace Connections And Work Requests`
  - `Search And Visibility`
  - `WhatsApp Notifications And Channel Boundary`
- Deferred does not mean dropped. It means those slices should be picked up
  later from the existing roadmap, PRDs, and issue handoff material rather than
  blocking the first shippable demonstration.

## Chunk 1: Workspace Membership And Settings

**Goal:** Make multi-workspace membership, workspace-scoped roles, invite-only access, and the minimum settings/admin area real.

**Representative boundaries:**

- `apps/auth`: Better Auth organization and membership integration
- `apps/web`: active-workspace switching, invite acceptance, settings/admin entrypoints
- `packages/db`: workspace profile data and any non-Better-Auth app tables

**Deliverables:**

- invite-only membership
- active workspace switching
- built-in workspace-scoped roles
- minimum settings/admin sections:
  - workspace profile
  - users and roles
  - labels
  - service zones
  - notification/channel settings

**Depends on:** none

**Blocks:** every later slice

**PRD should answer:**

- Better Auth organization plugin ownership
- Better Auth UI usefulness
- workspace and role vocabulary

## Chunk 2: Task Core

**Goal:** Ship the first real operational task system inside one workspace.

**Representative boundaries:**

- `apps/api/src/domains/work-management/task-core/*`
- `apps/web/src/domains/work-management/task-core/*`
- `packages/db`: task tables, action history, labels, task metadata

**Deliverables:**

- task create/read/update
- lifecycle status
- coordination state
- priority
- due date
- planned start/end
- labels
- action history
- default Linear-style task list
- task detail page
- shared task composer shell
- TanStack Form + shadcn/ui integration pattern for all major forms

**Depends on:** `workspace-membership-and-settings`

**Blocks:** field flow, intake, work requests, search

**PRD should answer:**

- label normalization
- task and coordination-state persistence
- list/detail information architecture

## Chunk 3: Assignees And Field Flow

**Goal:** Deliver assignees, field-worker permissions, self-assignment, and field-created task behavior.

**Representative boundaries:**

- `apps/api/src/domains/work-management/assignees/*`
- `apps/web/src/domains/work-management/assignees/*`
- `packages/db`: assignee records and membership snapshots if needed

**Deliverables:**

- assignee model
- self-assign flow
- field-created tasks defaulting to the creator's unit
- field-worker visibility rules
- field-worker edit permissions

**Depends on:** `task-core`

**Blocks:** WhatsApp notifications

**PRD should answer:**

- whether unit-membership snapshots are needed in v1
- exact role/permission matrix for field users

## Chunk 4: Manual Intake And Review

**Goal:** Deliver the manual structured form, free-text AI-assisted intake, reviewer queue, override flow, and draft finalisation.

**Representative boundaries:**

- `apps/api/src/domains/work-management/intake-review/*`
- `apps/web/src/domains/work-management/intake-review/*`
- `packages/db`: draft tasks, source snapshots, parse metadata

**Deliverables:**

- shared composer with internal-task vs work-request path
- manual structured entry
- free-text AI parsing
- multi-task extraction from one message
- review queue
- reviewer override of all extracted fields

**Depends on:** `task-core`

**Blocks:** higher-trust AI/channel-driven intake later

**PRD should answer:**

- parser/provider boundary
- source snapshot model
- confidence thresholds and clarification loops

## Chunk 5: Workspace Connections And Work Requests

**Goal:** Deliver explicit workspace connections, directional permissions, work-request inbox, acceptance/rejection/clarification, and hidden child-task delegation.

**Representative boundaries:**

- `apps/api/src/domains/work-management/work-requests/*`
- `apps/web/src/domains/work-management/work-requests/*`
- `packages/db`: workspace connections, work requests, parent/child links

**Deliverables:**

- connection invite/accept flow
- workspace-level directional permissions
- work-request inbox
- receiver-side editable draft before acceptance
- hidden child-task creation on acceptance
- parent visible roll-up from child execution

**Depends on:** `workspace-membership-and-settings`, `task-core`

**Blocks:** robust cross-workspace execution

**PRD should answer:**

- permission wording
- roll-up semantics
- parent/child UX hiding rules

## Chunk 6: Search And Visibility

**Goal:** Deliver permission-scoped full-text search plus private/shared visibility rules for notes and attachments.

**Representative boundaries:**

- `apps/api/src/domains/work-management/search-visibility/*`
- `apps/web/src/domains/work-management/search-visibility/*`
- `packages/db`: visibility fields and search support

**Deliverables:**

- full-text search
- task note visibility
- task attachment visibility
- permission-scoped results

**Depends on:** `task-core`

**Blocks:** none, but materially improves usability once task volume grows

**PRD should answer:**

- Postgres search vs later external index
- attachment metadata search scope

## Chunk 7: WhatsApp Notifications And Channel Boundary

**Goal:** Deliver outbound WhatsApp notifications for field assignment while preserving a pluggable channel adapter architecture for later inbound/outbound channel work.

**Representative boundaries:**

- `apps/api/src/domains/work-management/notifications/*`
- `apps/web/src/domains/settings/admin/*`
- optional later shared abstraction only if a real second consumer emerges

**Deliverables:**

- outbound-only WhatsApp notifications
- channel adapter boundary
- settings/admin controls for channel configuration

**Depends on:** `assignees-and-field-flow`, `workspace-membership-and-settings`

**Blocks:** future SMS/email/channel-led intake flexibility if skipped

**PRD should answer:**

- provider choice
- credential/config model
- failure tolerance and retry policy

## Linear Structure Recommendation

- Initiative: `Work Network MVP`
- Projects:
  - `Workspace Membership And Settings`
  - `Task Core`
  - `Assignees And Field Flow`
  - `Manual Intake And Review`
  - `Workspace Connections And Work Requests`
  - `Search And Visibility`
  - `WhatsApp Notifications`
- Documents:
  - `PRD 1: Workspace Membership And Settings`
  - `PRD 2: Task Core`
  - `PRD 3: Manual Intake And Review`
  - `PRD 4: Assignees And Field Flow`
  - `PRD 5: Workspace Connections And Work Requests`
  - `PRD 6: Search And Visibility`
  - `PRD 7: WhatsApp Notifications And Channel Boundary`

## Completion Criteria For This Planning Phase

- [ ] Each chunk has an owning Linear project or PRD.
- [ ] The first PRD includes an `edge cases backlog` section.
- [ ] The Better Auth organization-plugin question is resolved before implementation starts.
- [ ] The attachment storage and WhatsApp provider choices are either resolved or stubbed behind stable interfaces.
- [ ] The first implementation slice chosen after this plan is small enough to ship independently.
