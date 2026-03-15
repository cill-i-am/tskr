# Intent Layer Reference

Use this reference when placement is non-obvious and the repo needs a cleaner
model than "put all instructions at the root."

## Core Idea

An intent layer is the instruction topology that sits over a codebase. Its job
is to place stable intent where it belongs so agents can inherit broad rules,
pick up local refinements, and avoid duplicated or contradictory guidance.

The key distinction is semantic scope, not just directory structure.

## Semantic Boundary First

A good instruction node governs a meaningful unit:

- the whole repository
- a deployable app
- a shared package
- a feature slice
- a narrow operational area

A weak instruction node follows a folder boundary that exists for convenience
but does not represent a distinct intent domain.

Ask:

- does this subtree have its own rules, constraints, or responsibilities?
- would a local agent working here need different guidance from the parent?
- can I explain this node's purpose without describing the entire repo?

If not, the node probably does not deserve its own intent file.

The inverse also matters: if a subtree clearly has a different role but no local
node exists yet, infer that missing node instead of pretending the root is
sufficient.

## Nearest Common Ancestor Placement

Shared intent belongs at the lowest directory that still covers everything it
governs.

Use nearest-common-ancestor reasoning:

- if one rule applies to `apps/web` and `packages/ui`, place it at their nearest
  shared parent
- if a rule applies only to `apps/web`, move it down into `apps/web`
- if only `apps/web/src/features/tasks` needs a rule, do not leave it at the app
  root unless the entire app truly shares it

This keeps parent nodes broad and local nodes specific.

## Semantic Collection Nodes

Some directories deserve an intermediate node because the collection itself has
stable meaning.

Examples:

- `apps/` can own rules for deployable products, runtime configuration, and
  environment-specific concerns
- `packages/` can own rules for reusable workspace libraries, public APIs, and
  shared infrastructure

These nodes are justified when they clarify a real semantic category, even if
the collection currently contains only one child. Do not create them just to
mirror the folder tree. Create them when the collection role itself is useful
guidance.

## Parent And Child Relationship

Parent nodes provide stable defaults.

Child nodes should:

- refine parent intent
- add local constraints
- clarify local workflows

Child nodes should not:

- restate the parent in full
- drift into conflicting paraphrases
- become a second source of truth for the same scope

The pattern is inheritance plus local refinement, not duplication.

## Canonical Node And Downlinks

For this repo family:

- `AGENTS.md` is the canonical node for a scope
- `CLAUDE.md` should normally point to the colocated `AGENTS.md`
- tools that already read `AGENTS.md` directly should use it instead of getting
  their own mirrored prose

Downlinks are the mechanism that keep the tree understandable. A higher node
should push readers toward the narrower node that owns the local detail instead
of keeping all detail at the top.

In practice, a root node can mention that app-specific or feature-specific rules
live lower in the tree. The lower node then owns the actual local intent.

## Maintenance Loop

An intent layer stays healthy only if you keep folding duplicate prose back into
canonical nodes.

The maintenance loop is:

1. find duplicated or stale instructions
2. identify the real semantic owner
3. move the instruction to the correct canonical node
4. thin or remove mirrors
5. verify the resulting tree is easier to explain

When the tree becomes hard to explain, it is usually a sign that intent is
misplaced.

## Repo-Oriented Heuristics

Use these heuristics when editing instruction trees:

- root `AGENTS.md` should hold repo-wide tooling, architecture, and workflow
  rules
- nested `AGENTS.md` should exist only when a subtree has materially different
  constraints
- collection-level `AGENTS.md` can be worthwhile when a directory like `apps/`
  or `packages/` represents a stable semantic category
- colocated `CLAUDE.md` should usually be a symlink to the matching
  `AGENTS.md`
- legacy mirrors should survive only if a tool still requires them
- if a tool reads `AGENTS.md` directly, prefer deleting the mirror

## Example

Given:

```text
repo/
  AGENTS.md
  apps/
    AGENTS.md
    CLAUDE.md -> AGENTS.md
    web/
      AGENTS.md
      CLAUDE.md -> AGENTS.md
      src/
        features/
          tasks/
            AGENTS.md
  packages/
    AGENTS.md
    CLAUDE.md -> AGENTS.md
    ui/
      AGENTS.md
      CLAUDE.md -> AGENTS.md
```

Interpret it like this:

- `repo/AGENTS.md` owns repo-wide rules
- `apps/AGENTS.md` owns rules common to deployable applications
- `apps/web/AGENTS.md` owns app-specific behavior, deployment, and runtime rules
- `packages/AGENTS.md` owns rules common to reusable workspace packages
- `packages/ui/AGENTS.md` owns package-specific UI library build and export rules
- `apps/web/src/features/tasks/AGENTS.md` owns rules unique to the tasks slice

If `tasks` rules were copied into both the root and app nodes, move them down to
`tasks/AGENTS.md` and replace the broader copies with a short note that the
feature owns its own local guidance.

## Failure Modes

Common mistakes:

- putting all intent at the root because it feels simpler
- creating nested nodes for every folder whether or not the scope is real
- copying the same guidance into `AGENTS.md`, `CLAUDE.md`, and tool-specific
  files
- deleting legacy files before unique instructions have been re-homed
- choosing a technical boundary when the semantic boundary is lower or higher

When in doubt, optimize for one canonical home per rule and the smallest set of
instruction files that still expresses the repo's real structure.
