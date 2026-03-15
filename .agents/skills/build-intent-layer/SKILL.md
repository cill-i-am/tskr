---
name: build-intent-layer
description: Use when building, repairing, or reorganizing a repository's AI instruction topology around semantic boundaries, especially with nested AGENTS.md files, colocated CLAUDE.md files, or multi-agent setups involving Codex, Claude Code, Cursor, or GitHub Copilot.
---

# Build Intent Layer

## Overview

Build the repo's instruction topology around the code it governs. Treat
`AGENTS.md` as the canonical intent node for each semantic scope, colocate
`CLAUDE.md` with that node, and keep every other consumer thinner than the
canonical source.

## Preflight

Before editing anything:

1. Inventory instruction consumers and related config.
2. Identify which paths each instruction file actually governs.
3. Decide whether the request is repo-wide, app-specific, package-specific, or
   feature-specific.

Start with:

```bash
find . -name AGENTS.md -o -name CLAUDE.md -o -name copilot-instructions.md
```

If the repo shape or placement logic is unclear, read
`references/intent-layer.md` before making changes.

## Canonical Rules

- `AGENTS.md` is the source of truth for shared intent at a given scope.
- Place intent at the nearest common ancestor of the code and directories it
  governs.
- Infer missing child nodes when a subtree has distinct local semantics, even if
  no instruction file exists there yet.
- Move narrower intent downward instead of restating it at the root.
- Prefer local refinement over duplicated restatement.
- Put `CLAUDE.md` beside the matching `AGENTS.md`.
- Default `CLAUDE.md` to a symlink to the colocated `AGENTS.md`.
- Keep legacy mirrors only when a tool still requires them.
- If GitHub Copilot or Cursor already read `AGENTS.md`, do not maintain extra
  mirror files just for them.

## Workflow

### 1. Inventory the instruction graph

Inspect:

- root and nested `AGENTS.md`
- root and nested `CLAUDE.md`
- legacy agent-specific files such as `.github/copilot-instructions.md`
- config files that point to instruction files

Note which files are canonical, which are mirrors, and which contain unique
instructions that still need a home.

### 2. Map each node to governed paths

For each instruction file, answer:

- which directories or files does it apply to?
- which agents or tools read it?
- does it govern a semantic unit or only reflect a technical folder boundary?

If a node cannot be tied to a clear scope, treat that as a placement smell and
fix the topology before adding more prose.

Do not limit yourself to normalizing existing files. If the repo clearly has a
deployable app, shared package, feature slice, or stable collection like
`apps/` or `packages/`, infer the missing canonical nodes and create them.

### 3. Choose canonical nodes with nearest-common-ancestor reasoning

Use the lowest directory that still covers every consumer that needs the same
intent.

Examples:

- repo-wide tooling and monorepo rules belong at the repository root
- collection-level rules for deployable applications can belong under `apps/`
- collection-level rules for reusable packages can belong under `packages/`
- app-specific deployment rules belong under that app
- package-specific build or export rules belong under that package
- feature-specific guardrails belong inside the feature subtree

If two sibling areas share a rule, move it up to their nearest common ancestor.
If only one area needs a rule, move it down.

A collection node is justified when the directory represents a stable semantic
category, not just when it already has multiple children. For example, `apps/`
can own "deployable app" guidance and `packages/` can own "reusable shared
package" guidance even if each currently has one child.

### 4. Apply the topology

Edit in this order:

1. Rewrite or create the canonical `AGENTS.md` nodes.
2. Create or replace colocated `CLAUDE.md` files.
3. Make `CLAUDE.md` a symlink to the matching `AGENTS.md` when the filesystem
   supports it.
4. Fall back to a thin pointer file when a symlink is unsafe or unsupported.
5. Remove or thin legacy mirrors when tools already read `AGENTS.md` directly.

Keep local `AGENTS.md` files additive and scoped. They should refine their
parent node, not copy it verbatim.

When you create inferred nodes, write only the local semantic delta:

- collection nodes explain the role of the subtree
- leaf app nodes explain runtime, deploy, and framework constraints
- leaf package nodes explain build, export, and reuse constraints

### 5. Re-home unique intent before deleting mirrors

When a non-canonical file contains unique instructions:

1. move those instructions into the correct canonical `AGENTS.md`
2. keep only the minimal agent-specific wrapper that is still required
3. delete the duplicate prose only after it has a canonical home

Never destroy unique intent just because the file layout is messy.

### 6. Verify the result

Before claiming success, verify:

- every intended canonical node exists
- every `CLAUDE.md` points at the intended `AGENTS.md`
- legacy mirrors were removed only when safe
- moved instructions appear exactly once in the final topology
- the resulting tree is easier to explain than the one you started with

Useful checks:

```bash
find . -name AGENTS.md -o -name CLAUDE.md -o -name copilot-instructions.md
find . -name CLAUDE.md -type l -exec ls -l {} \;
```

## Safeguards

- If scope is ambiguous, choose the narrowest node that still covers every known
  consumer and explain the tradeoff.
- If the repo already has a reasonable topology, repair it incrementally instead
  of flattening it.
- If a symlink is not viable, use a thin colocated `CLAUDE.md` pointer file.
- If a legacy file still has a real consumer, keep it thin and derivative.
- If a tool reads `AGENTS.md` directly, do not invent extra mirrors.

## Reference Routing

Read `references/intent-layer.md` when you need:

- the semantic model behind placement decisions
- nearest-common-ancestor examples
- guidance on downlinks and parent/child refinement
- help deciding whether a boundary is semantic or merely technical

## Response Format

Return:

1. the instruction nodes you found
2. the canonical nodes you chose and why
3. the files you created, rewrote, linked, or removed
4. any exceptions or unresolved judgment calls
