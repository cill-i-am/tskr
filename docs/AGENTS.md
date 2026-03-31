# Docs Intent

Follow the root `AGENTS.md` first. This node adds guidance for durable project
documentation under `docs/*`.

## Scope

- `docs/*` contains architecture guidance, dated specs, decisions, and
  implementation plans that should outlive one terminal session or PR.

## Rules

- Put durable architectural decisions here instead of scattering the same rule
  across multiple app or package notes.
- Use `docs/architecture/*` for stable cross-cutting architecture guidance and
  `docs/superpowers/specs/*` for dated product or implementation decisions,
  unless a narrower docs subtree later earns its own intent node.
- When a design choice becomes a dependency for multiple follow-on tickets,
  capture or update the canonical decision doc before repeating it in
  `AGENTS.md` files.
- Keep docs additive and canonical. Update the owning decision or spec instead
  of creating overlapping restatements of the same rule.
