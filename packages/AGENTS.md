# Packages Intent

Follow the root `AGENTS.md` first. This node adds guidance for reusable
workspace packages under `packages/*`.

## Scope

- `packages/*` contains shared libraries, infrastructure, and stable contracts
  used across the workspace.
- Package-level guidance should focus on reuse boundaries, exports, and build
  contracts rather than product behavior.

## Rules

- Keep public APIs explicit and intentional.
- Put cross-cutting infrastructure here only when it has a real shared consumer
  or stable platform boundary.
- Avoid pulling app-specific workflows, screens, or feature behavior into
  `packages/*`.
- Push narrower build, export, or design-system rules down into the owning
  package-level `AGENTS.md` file.
- Use package-level intent nodes for shared infrastructure with distinct build
  or provider boundaries, such as `packages/email/AGENTS.md` for transactional
  email delivery primitives.
