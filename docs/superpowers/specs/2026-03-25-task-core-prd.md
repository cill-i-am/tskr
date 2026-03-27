# PRD 2: Task Core

## Problem Statement

The product needs a usable core task system inside a single workspace before it
can support field execution, AI intake, cross-workspace delegation, or richer
visibility rules.

Right now, the product direction is clear but the central operational object is
still missing. Users need a place to create work, see work, update work,
assign work, and track work through a small reversible lifecycle. Without that
core, later slices would be forced to invent task semantics indirectly through
onboarding, intake, or notifications, which would create a weak foundation.

This slice should create a Linear-style task core adapted to operations work:
a flat task list, a strong detail panel, inline editing, aging, labels,
optional priority, optional due dates, internal notes, internal attachments,
action history, and a shared composer. It should stay single-workspace only.

## Solution

Build a dedicated `task-core` slice that establishes the canonical single-
workspace task model and the default operational UI around it.

Each task has one canonical rich text body, structured location fields,
optional assignee, optional labels, nullable priority, optional due date,
optional planned start and end dates, lifecycle status, coordination state,
internal notes, internal-only attachments, and action history. Tasks can be
created as drafts, saved as ready, or created directly as assigned depending on
completeness and assignee presence.

The default home screen becomes a Linear-style flat task table with filtering,
inline editing, and a side-panel detail view. A shared composer opens in a
modal and supports both manual creation and later reuse by the intake slice.
The product includes basic keyboard power-user interaction with TanStack
Hotkeys plus a command bar for navigation/actions, but not bulk actions or
grouping yet.

This PRD explicitly stays inside one workspace. Workspace-to-workspace
connections, work requests, and hidden child-task delegation are separate
later slices.

## User Stories

1. As an admin or dispatcher, I want to create a task manually, so that I can capture work that needs doing inside the workspace.
2. As a user creating a task, I want the minimum required data to be small, so that I can capture work quickly.
3. As a user, I want to save an incomplete task as a draft, so that I can return to it later without losing work.
4. As a user, I want a complete unassigned task to become ready automatically, so that the system reflects that it can be picked up.
5. As a user, I want a complete task with an assignee to become assigned automatically, so that creation and assignment can happen in one flow.
6. As a user, I want one canonical rich text task body, so that I do not have to maintain separate title and description fields that drift apart.
7. As an operator, I want the system to derive a short display summary from the task body and location when needed, so that tasks still scan well in lists.
8. As a user, I want structured location fields on each task, so that work remains dispatchable and searchable.
9. As a user, I want the task to support address lines, locality, county/region, postal code/Eircode, and coordinates when available, so that location data is usable later.
10. As a user, I want reusable property/location records deferred until later, so that task core stays focused.
11. As a workspace, I want labels to come from a workspace-defined label set, so that filtering and naming stay clean.
12. As a user, I want labels to be optional, so that simple tasks are not forced into unnecessary classification.
13. As a dispatcher, I want priority to be optional rather than defaulted, so that priority remains an intentional signal rather than noise.
14. As a user, I want the task list default sort to be driven by age and status, so that the most operationally relevant work rises first.
15. As a team, I want a small fixed lifecycle, so that status stays understandable and consistent.
16. As a user, I want statuses to include `draft`, `ready`, `assigned`, `in-progress`, `done`, and `cancelled`, so that the full basic work lifecycle is covered.
17. As a user, I want status changes to be reversible, so that real-world mistakes do not trap the system in the wrong state.
18. As a user, I want moving out of `done` to require a reason, so that reopening work is explicit and auditable.
19. As a system, I want coordination state separated from lifecycle status, so that administrative workflow does not pollute the core work lifecycle.
20. As a user, I want coordination state to stay workflow-driven rather than a generic dropdown, so that the system remains coherent.
21. As a task owner, I want internal notes separate from the core task body, so that ongoing updates do not overwrite the original task definition.
22. As a workspace, I want notes in this slice to be internal-only, so that later visibility rules can be added cleanly.
23. As a user, I want task attachments from day one, so that receipts, screenshots, and site photos can live with the task.
24. As a workspace, I want attachments in this slice to be internal-only, so that later visibility work can add sharing deliberately.
25. As a field user or office user, I want to upload attachments, so that task records work in both office and on-site contexts.
26. As a user, I want attachments untyped in the first slice, so that core task capture stays simple.
27. As a workspace, I want a task action history, so that important changes are reconstructable later.
28. As a user, I want history to record task creation, task updates, status changes, assignee changes, notes, attachments, and reopen events, so that the task’s operational story is visible.
29. As a user, I want the main task list to be the default home surface, so that the app opens where operational work happens.
30. As a user, I want the task list to be a flat table first, so that it handles operational density better than a kanban board.
31. As a user, I want inline editing for key fields, so that I can update tasks quickly from the list.
32. As a user, I want inline editing for status, priority, labels, assignee, and due date, so that common actions are fast.
33. As a user, I want filters for status, priority, assignee, labels, aging state, and due date presence/overdue, so that I can find the work I need.
34. As a user, I want due date visible in the default task list, so that time-sensitive work is obvious.
35. As a user, I want planned dates kept in detail/composer rather than cluttering the default table, so that the list stays focused.
36. As a user, I want the detail view to open from the list in a side panel, so that I can inspect and edit tasks without losing list context.
37. As a mobile user, I want the same detail surface to come from the bottom, so that the interaction remains usable on small screens.
38. As a user, I want the task composer to open in a modal, so that creation feels quick and lightweight.
39. As a user, I want the command bar to exist in this slice, so that navigation and task creation feel fast.
40. As a user, I want the command bar to focus on commands and navigation rather than editing task fields, so that it stays simple in the first version.
41. As a keyboard-focused user, I want `j/k`-style navigation in the list, so that I can move quickly through tasks.
42. As a keyboard-focused user, I want a small, high-value shortcut set, so that power features help without becoming noisy.
43. As a user, I want creating a task from the command bar to open the same shared composer as everywhere else, so that creation stays consistent.
44. As a workspace, I want no grouping or bulk actions yet, so that the first task list stays simple and focused.
45. As a workspace, I want aging state visible in the task list, so that stale work stands out.
46. As a workspace, I want aging thresholds to come from workspace settings rather than hardcoded values, so that the task core respects workspace policy.

## Implementation Decisions

- This PRD covers single-workspace task core only.
- It excludes workspace connections, work requests, parent/child delegated tasks, and shared visibility between workspaces.
- It includes enough assignee structure to assign tasks, but deeper assignee-management workflows belong to a later slice.
- Minimum manual task creation data is:
  - canonical rich text task body
  - dispatchable structured location
  - optional assignee
  - optional priority
  - optional due date and planned dates
- The task body is the single canonical description field.
- A short list summary may be derived for display, but it is not a separate required user-maintained field in this slice.
- Task location is structured and should support:
  - address line 1
  - address line 2
  - town/city
  - county/region
  - postal code or Eircode
  - coordinates when available
- Reusable property/location records are out of scope for this PRD and should be tracked as a later follow-up.
- Labels are functional in this slice.
- Labels come only from a workspace-defined label set.
- Tasks may have zero labels.
- Priority is nullable and should not default automatically.
- Default task list sorting is age/status-driven, not priority-first.
- Lifecycle statuses are:
  - `draft`
  - `ready`
  - `assigned`
  - `in-progress`
  - `done`
  - `cancelled`
- Status transitions are reversible.
- Leaving `done` requires a reason and should be recorded distinctly in history as a reopen event.
- `cancelled` freezes normal editing in this slice, while still allowing status reversal out of `cancelled`.
- Single-workspace coordination states remain minimal:
  - none/default
  - `needs review`
  - `needs clarification`
- Coordination state is workflow-driven, not a general-purpose user-editable field in this slice.
- Internal notes are included now and remain internal-only in this slice.
- Attachments are included now and remain internal-only in this slice.
- Attachments are untyped in this slice.
- Attachment upload is available to both office/admin users and field users.
- Base action history in this slice should record:
  - task created
  - task updated
  - status changed
  - assignee changed
  - note added
  - attachment added
  - task reopened
- The main task list is the default home view.
- The main list is a flat table, not grouped, and has no bulk actions or multi-select in this slice.
- Default visible list columns should include:
  - aging signal and age
  - derived summary
  - labels
  - location
  - requester
  - assignee
  - status
  - priority
  - due date
- Inline editing in the list covers:
  - status
  - priority
  - labels
  - assignee
  - due date
- Minimum built-in filters are:
  - status
  - priority
  - assignee
  - labels
  - aging state
  - due date presence/overdue
- Planned start and planned end exist in the core model but are not default columns in the main table.
- Task detail should open from the list in a side panel:
  - from the right on larger screens
  - from the bottom on mobile
- The detail surface should use the shadcn drawer pattern.
- The shared task composer should open in a modal.
- The composer should support saving incomplete tasks as `draft`.
- On create:
  - incomplete task -> `draft`
  - complete task with no assignee -> `ready`
  - complete task with assignee -> `assigned`
- Assignee selection is part of the normal creation flow rather than a separate “save and assign” action.
- Keyboard interactions are in scope and should use TanStack Hotkeys.
- The shortcut set in this slice should stay small and high-value.
- `j/k` list navigation is in scope.
- A command bar is in scope and should use shadcn command primitives.
- The command bar in this slice is for commands/navigation only, not task-field editing.
- Creating a task from the command bar should open the same shared composer as the rest of the app.
- Workspace-level aging thresholds should be respected by task-core aging signals rather than hardcoding thresholds inside this slice.

## Testing Decisions

- Good tests should focus on external behavior, state transitions, permissions, and the list/detail/composer experience rather than implementation details of components or persistence internals.
- This slice should test:
  - manual task creation
  - draft save behavior
  - automatic status derivation on create
  - reversible status transitions
  - required reopen reason when leaving `done`
  - nullable priority
  - workspace-defined labels only
  - structured location persistence
  - notes and attachments creation
  - action history recording
  - list filtering and default sort behavior
  - inline editing behavior
  - side-panel detail flow
  - command bar and hotkey basics
- Tests should cover both API/service behavior and web interaction behavior.
- Prior art should come from:
  - existing auth route/service tests in the repo
  - current web auth-page interaction tests
- Focused route/service tests plus focused UI tests are preferred over heavyweight end-to-end tests for most of this slice.

## Out Of Scope

- Workspace-to-workspace task behavior
- Work requests and delegation
- Parent/child task relationships
- Shared/private visibility rules beyond internal-only notes and attachments
- Property/location history records
- Bulk actions or multi-select
- Grouped list views
- Kanban view
- Saved views
- Command-bar task search
- Quick-create composer variant
- Attachment categorization
- Assignee-management workflows beyond basic assignability

## Further Notes

- This slice should feel like the first genuinely useful operational surface in the product.
- It should deliberately resemble the speed and density of Linear where that helps, while still respecting the trades/operations domain.
- Follow-ups that should stay visible but outside this slice:
  - reusable property/location records
  - grouped/kanban views
  - bulk actions
  - richer command-bar search
  - attachment visibility controls
