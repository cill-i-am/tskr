# Build Intent Layer Design

## Goal

Create a reusable `build-intent-layer` skill for this repo family that turns the
Intent Layer model into an operational workflow for multi-agent repositories.
The skill should help Codex inspect a repo, find the right semantic boundaries
for AI instructions, and then create or repair the instruction topology by
default.

The skill is opinionated:

- `AGENTS.md` is the canonical instruction node for each semantic scope
- `CLAUDE.md` should be colocated with the matching `AGENTS.md` and should
  default to a symlink to that file when the filesystem supports it
- tools that already read `AGENTS.md` directly, including GitHub Copilot and
  Cursor, should rely on those canonical nodes instead of introducing extra
  mirrored instruction files
- multi-agent support is a first-class requirement, not an optional add-on

## User-Facing Behavior

The skill should trigger when a user wants to:

- build or repair an "intent layer" in a repository
- reorganize AI instruction files around semantic boundaries
- deduplicate or relocate `AGENTS.md` and `CLAUDE.md` instructions
- make `AGENTS.md` the source of truth and project only the agent-specific
  files that are still required
- analyze where instructions should live in a monorepo or nested repo

The skill should default to making changes, not just proposing them. It should
still summarize its placement reasoning before or alongside edits so the operator
can understand what changed.

## Core Model

The skill should encode the main concepts from the Intent Layer article:

- intent belongs at semantic boundaries, not just technical boundaries
- the correct placement for shared intent is the nearest common ancestor of the
  files or directories governed by that intent
- local nodes should refine parent intent rather than restate it
- downlinks should point consumers toward the right local node instead of
  duplicating long instruction blocks
- the system should stay maintainable by preferring one canonical source over
  many partially synchronized copies

In practice this means broad repo-wide rules stay at the root `AGENTS.md`, while
feature-, app-, or package-specific guidance moves downward into narrower
instruction nodes only when the scope actually differs.

## Workflow

The skill should run the following sequence:

1. Inventory existing instruction consumers and nearby config:
   - root and nested `AGENTS.md`
   - root and nested `CLAUDE.md`
   - legacy agent-specific instruction files such as
     `.github/copilot-instructions.md`
   - agent-specific config files that reference or mirror instructions
2. Map each instruction file to the paths and teams or agents it appears to
   govern.
3. Detect duplicated, stale, or misplaced intent.
4. Choose canonical instruction nodes using nearest-common-ancestor reasoning.
5. Rewrite or create `AGENTS.md` files so each node owns the intent for its
   semantic scope.
6. Replace colocated `CLAUDE.md` files with symlinks to the matching
   `AGENTS.md` when appropriate, or with minimal pointer files when symlinks
   are not suitable.
7. Remove or thin legacy agent-specific instruction files when the relevant
   tool already reads `AGENTS.md` directly.
8. Verify that links resolve, files exist, and the resulting topology is
   internally consistent.
9. Summarize the final intent graph, notable moves, and any unresolved judgment
   calls.

## Safeguards And Error Handling

The skill should behave conservatively when the repo shape is ambiguous:

- if multiple candidate canonical nodes are plausible, explain the ambiguity and
  choose the narrowest node that still covers all known consumers
- if a symlink cannot be created because of platform or repo constraints, write a
  thin colocated `CLAUDE.md` pointer file instead of failing the whole
  operation
- if an existing agent-specific file contains unique instructions that are not
  clearly redundant, preserve them long enough to merge or re-home them into the
  appropriate `AGENTS.md`
- if the repo already uses a different instruction convention, adapt rather than
  blindly flattening it

The skill should avoid destructive rewrites that discard intent without first
re-homing that intent into the chosen canonical node.

## Verification

Before claiming success, the skill should verify:

- every created or rewritten instruction file exists at the expected path
- every `CLAUDE.md` symlink resolves to the intended `AGENTS.md`
- any retained legacy agent-specific instruction file still points to a valid
  canonical source
- moved instructions are represented exactly once in the resulting topology
- the final summary names any intentionally retained exceptions

## Skill Contents

The skill should stay lean:

- `SKILL.md` should contain the procedural workflow, trigger conditions,
  decision rules, and mutation defaults
- `references/intent-layer.md` should capture the article-derived model and the
  terminology needed for correct placement decisions
- `agents/openai.yaml` should expose a clear human-facing name, short
  description, and default prompt

No scripts are required in the first version. The workflow is largely inspection,
reasoning, file editing, and link verification. Scripts can be added later only
if repeated sync behavior becomes mechanical enough to justify them.

## Non-Goals

The first version should not:

- invent a repo-wide manifest or registry format
- manage every AI tool on the market
- introduce a background sync system
- rewrite unrelated project documentation
- force symlink usage when the environment or repo policy makes it unsafe
- preserve obsolete agent-specific mirrors when the tool now reads
  `AGENTS.md` directly

## Success Criteria

The skill is successful when it enables another Codex instance to:

- identify the correct semantic scope for instruction files
- reduce duplicated intent across agents
- establish `AGENTS.md` as the canonical node for each scope
- create colocated `CLAUDE.md` links and eliminate unnecessary mirrors with
  minimal ambiguity
- leave the repo with a clearer, easier-to-maintain instruction topology than it
  had before
