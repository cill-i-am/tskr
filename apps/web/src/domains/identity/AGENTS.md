# Identity Domain Intent

Follow the root `AGENTS.md`, `apps/AGENTS.md`, and `apps/web/AGENTS.md` first.
This node adds guidance for the identity domain inside the web app.

## Scope

- `apps/web/src/domains/identity` owns web-facing identity product behavior.
- This includes auth UI now and workspace membership/settings forms that will
  land under the same domain family.

## Rules

- Keep TanStack Form setup, validators, submit handlers, and navigation inside
  the owning slice.
- Prefer shared form presentation adapters from `@workspace/ui/components/form`
  before creating new slice-local field wrappers.
- Keep Better Auth as infrastructure and API behavior, not as the owner of web
  UI composition.
- If a form has one narrow UX exception that does not generalize cleanly, keep
  that exception local instead of expanding the shared UI API too early.
