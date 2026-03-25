# PRD 1: Workspace Membership And Settings

## Problem Statement

The product needs a clean multi-workspace foundation before task assignment,
intake, dispatch, and cross-workspace work requests can exist safely.

Users will often belong to more than one workspace and may play different roles
in each one. A person might own one business, work as a field worker for
another, and later join a third workspace as an admin. Without explicit
workspace membership, active-workspace switching, invite-only access, and
workspace-scoped roles, later slices like task ownership, assignee logic, and
cross-workspace collaboration will become ambiguous and fragile.

The current repo already has a solid authentication foundation, but it does not
yet provide the product-level workspace model needed for a networked operations
app. This PRD establishes that foundation without dragging in later concerns
like task core, workspace connections, or dispatch workflows.

## Solution

Build a dedicated workspace-membership and settings slice that sits on top of
the existing auth foundation.

In v1, a signed-in user can create a workspace with a name, receive a derived
slug, and become its initial owner. Users can also join other workspaces by
accepting invites. Membership is invite-only. A user can belong to multiple
workspaces, roles are scoped per workspace, and the active workspace is stored
remotely so it follows the user across devices.

Workspace setup lives in its own gated onboarding route tree, separate from the
auth flows. A user cannot enter the main app until they either create or join
at least one workspace and a valid active workspace is established. The
settings shell includes real account and workspace sections, with functional
profile and user-management pages plus stubs for later sections like labels,
service zones, and notification channels.

This slice does not include task management or workspace-to-workspace
connections yet. It exists to make later vertical slices safe and coherent.

## User Stories

1. As a new user, I want to create my own workspace after signup, so that I can start using the product immediately.
2. As a new user, I want `create workspace` to be the primary onboarding path, so that the default setup feels direct.
3. As a new user, I want to join a workspace via invite instead, so that I can enter an existing company or team.
4. As a user with no workspace yet, I want onboarding to keep me inside a setup flow until I have one, so that I do not land in a broken app state.
5. As a user, I want auth and workspace setup to remain separate concerns, so that identity setup does not become tangled with org setup.
6. As a workspace creator, I want only the workspace name required at creation time, so that setup stays fast.
7. As a workspace creator, I want the workspace slug generated automatically from the name, so that the product has a durable identifier for future routing and sharing.
8. As a workspace owner, I want to invite teammates into my workspace, so that we can collaborate inside one workspace.
9. As an owner or admin, I want invites to be scoped to one workspace and one role, so that membership stays explicit and easy to understand.
10. As an owner or admin, I want to revoke an outstanding invite before it is accepted, so that I can correct mistakes or stop access before it begins.
11. As an owner or admin, I want invite codes to be visible and copyable, so that I can share them manually through channels like WhatsApp.
12. As an invited user, I want invites to work through both a signed link and a manual short code, so that I can join even if the invite is forwarded outside the app.
13. As an invited user, I want invite codes to be short and human-shareable, so that they work well in real-world messaging.
14. As an invited user with an existing account, I want accepting an invite to attach the workspace smoothly to my account, so that I do not have to fight the login flow.
15. As a newly invited user, I want the product to switch me into the workspace immediately after acceptance, so that I land where I need to work.
16. As a user who belongs to multiple workspaces, I want my last active workspace remembered across devices, so that the product reopens in the place I was actually working.
17. As a user who belongs to multiple workspaces, I want the product to recover gracefully if my last active workspace is no longer valid, so that I can keep working without confusion.
18. As a user, I want to see all my workspaces in a switcher, so that I can move between them intentionally.
19. As a user, I want the workspace switcher to show logo, name, and my role in each workspace, so that I can orient myself quickly.
20. As a user, I want pending invites visible in the workspace switcher too, so that “join another workspace” lives in the same mental place as “switch workspace.”
21. As a user, I want to belong to multiple workspaces with different roles in each one, so that the product matches real-world contracting and owner-operator situations.
22. As an owner, I want multiple owners to be possible in one workspace, so that the workspace does not depend on one person forever.
23. As an owner, I want only owners to promote or demote other owners and transfer ownership, so that the highest-trust role stays tightly controlled.
24. As an admin, I want to manage users and invites without being able to change ownership, so that admins can operate the workspace safely without having absolute control.
25. As a member, I want to leave a workspace myself, so that I can remove myself from organizations I no longer work with.
26. As a workspace, I want the last owner protected from leaving accidentally, so that the workspace is never left ownerless.
27. As a user, I want my personal profile data to belong to me rather than to a workspace, so that my identity is not trapped inside one org.
28. As a user, I want to edit my own name and avatar presentation, so that my personal profile stays current.
29. As a user, I want avatar UI to fall back to initials if no uploaded image exists, so that profile identity still looks complete without blocking on storage work.
30. As a workspace owner, I want a settings/admin shell with clear account and workspace sections, so that configuration work has a stable home.
31. As an owner or admin, I want a real workspace profile page, so that the workspace has an editable identity.
32. As an owner or admin, I want a real users-and-roles page, so that membership management is possible from day one.
33. As a team, I want later settings sections like labels, service zones, and notification channels to have a home already, so that the IA does not keep changing every slice.
34. As a developer planning later slices, I want workspace membership and active workspace state established first, so that task ownership and later permissions have a stable base.
35. As an operator, I want email verification to remain required, so that workspace membership still sits on a trustworthy account identity.
36. As a product team, I want membership and invite records to be soft-deletable or revocable rather than hard-destroyed, so that the system retains enough auditability for future operational review.

## Implementation Decisions

- This PRD covers workspace membership and settings only. It explicitly excludes task core, assignee logic, and workspace-to-workspace connections.
- Authentication remains a separate concern. Workspace setup is a gated onboarding flow under a dedicated route tree such as `/onboarding` or `/setup`.
- Setup is considered complete when the user belongs to at least one workspace and a valid active workspace is established.
- The onboarding flow should present two choices:
  - primary: create workspace
  - secondary: join workspace by invite
- Workspace creation requires only a workspace name.
- Workspace slug is derived and stored at creation time.
- Workspace logo is editable later in settings; deeper branding stays out of scope for this slice.
- Users can belong to multiple workspaces.
- Roles are scoped per workspace, not global to the user account.
- Built-in roles for the broader product remain `owner`, `admin`, `dispatcher`, and `field worker`, but this PRD only needs the membership and management behavior that makes those roles possible.
- Multiple owners are allowed in one workspace.
- Only owners can create/remove other owners or transfer ownership.
- Admins can manage users and invites, but cannot manage ownership.
- Users can leave a workspace themselves, except that the last owner cannot leave until ownership is transferred or another owner exists.
- Active workspace must be stored remotely and restored across devices.
- When the stored active workspace becomes invalid:
  - if one valid workspace remains, switch automatically
  - if several remain, prompt for selection
- Workspace switcher must show:
  - workspace logo
  - workspace name
  - current user role in that workspace
  - pending invites in a distinct section/state
- Invite model is:
  - one workspace per invite
  - one role per invite
  - no expiration in v1
  - revocable before acceptance
- Invite acceptance must support:
  - signed links
  - manual short-code entry
- The short invite code is the canonical human-facing identifier.
- Signed invite links should wrap the short code rather than replace it.
- Invite codes should be short and human-shareable, with a `nanoid`-style implementation direction.
- Accepting an invite should switch the user into that workspace immediately.
- If an invite is accepted by an email that already has an account, membership should attach smoothly to that existing account.
- User-owned profile editing should exist in the settings shell and cover at least:
  - name
  - avatar presentation with initials fallback
- The settings shell should have separate account and workspace sections within one settings area.
- The settings shell should include:
  - real account/profile section
  - real workspace profile section
  - real users-and-roles section
  - stub sections for labels, service zones, and notification/channel settings
- `workspace type` is intentionally out of scope for this PRD and should be tracked as a later follow-up.
- Better Auth organization-plugin integration needs explicit technical verification before implementation begins.
- Better Auth UI should be investigated as a possible accelerator for auth/workspace surfaces before hand-rolling everything.
- A standard TanStack Form + shadcn/ui form integration pattern should be established in or before this slice so later settings and task forms stay consistent.
- Soft deletion / revocation should preserve backend auditability for memberships and invites, but no dedicated audit UI is needed in this slice.

## Testing Decisions

- Good tests should verify user-visible behavior and permission boundaries rather than internal implementation details.
- This slice should test:
  - workspace creation
  - slug derivation
  - invite issuance
  - invite revocation
  - invite acceptance via link
  - invite acceptance via short code
  - active workspace persistence and recovery
  - workspace switcher behavior
  - owner/admin/member permission boundaries
  - self-leave behavior and last-owner protection
  - multi-workspace membership on one account
- Tests should cover both auth/service behavior and web UX behavior where appropriate.
- Prior art for test style lives in:
  - auth route/config tests in the existing auth slice
  - web auth page tests in the current web identity UI
- This slice should prefer focused route/service tests plus focused UI tests over giant end-to-end flows unless a specific onboarding path truly needs an integration-style test.

## Out Of Scope

- Task core and lifecycle
- Assignee model and field-worker execution rules
- Workspace-to-workspace connections
- Work requests and delegation
- Labels, service zones, and notification settings as functional product features
- Comment threads or notifications center
- Deep workspace branding or theming
- Workspace type taxonomy
- Avatar upload/storage beyond lightweight avatar presentation and initials fallback
- Audit-log UI

## Further Notes

- This PRD is the enabling slice for nearly every later product capability, so keeping the boundary sharp matters more than making it feel “feature rich.”
- The product should continue treating auth as infrastructure and workspace membership as product behavior layered on top.
- The edge-cases backlog for the broader work-network product is maintained in:
  - [2026-03-24-work-network-edge-cases.md](/Users/cillianbarron/Documents/Development/tskr/docs/superpowers/specs/2026-03-24-work-network-edge-cases.md)
- Follow-up ideas that should stay out of this slice but not be forgotten:
  - workspace type
  - richer branding
  - custom roles
  - invitation expiration policies
