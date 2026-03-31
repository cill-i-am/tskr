# Ultracite Rules

These instructions are the project-local AI rules for Codex and OpenCode, and the shared source for other agent-specific files in this repo.

## Purpose

- Keep all code compatible with the root Ultracite setup: Oxlint `core` plus `react`, and Oxfmt at the repo root.
- Prefer changes that pass automated linting and formatting without follow-up hand-tuning.
- Keep edits minimal, local, and consistent with the existing monorepo structure.

## Required Workflow

- After editing code or config, run `pnpm exec ultracite fix` from the repository root once dependencies are installed.
- If you touch multiple files, prefer one coherent change over repeated stylistic churn.
- Do not add new local lint or format tools when the root Ultracite config already covers the need.
- Preserve existing behavior unless the task explicitly changes behavior.

## Formatting Standards

- Use double quotes in JavaScript and TypeScript.
- Omit semicolons.
- Keep `trailingComma` at `"es5"`.
- Keep `printWidth` at `80` and `tabWidth` at `2`.
- Keep `endOfLine` at `"lf"`.
- Do not manually reorder imports in ways that conflict with Oxfmt.
- Do not manually reorder Tailwind classes in ways that conflict with Oxfmt.

## Import Rules

- Treat `@workspace/` imports as internal workspace imports.
- Let Oxfmt own import ordering.
- Prefer existing workspace aliases over long relative traversals when both are already supported.
- Avoid unnecessary import splitting or grouping churn unless the task requires it.

## Tailwind Rules

- Use Oxfmt Tailwind sorting with the v4 stylesheet at `packages/ui/src/styles/globals.css` once the formatter is installed.
- Treat `cn`, `cva`, and `clsx` as Tailwind-aware helper functions.
- Keep class strings readable; do not preserve bespoke ordering that the formatter will rewrite.

## Linting Expectations

- Write code that is compatible with Ultracite Oxlint `core` and `react` presets.
- Prefer clear, direct React and TypeScript code over clever patterns that trigger avoidable lint noise.
- Keep accessibility in mind for JSX changes.
- Avoid introducing dead code, duplicate imports, or formatting-only edits unrelated to the task.

## Monorepo Guidance

- Root tooling is authoritative for shared linting and formatting.
- Keep package-specific config additions justified and minimal.
- Respect the `apps/*` and `packages/*` workspace layout.
- Preserve repo-wide conventions before introducing package-local exceptions.

## Architecture Rules

- Organize product code by domain and feature slice, not by horizontal technical layers.
- Design features so a full vertical slice can be delivered in one pass, including UI, auth concerns, API behavior, and persistence or integration touchpoints when needed.
- Treat a feature slice as the product capability it delivers, not as a single process boundary. A slice may span `web`, `auth`, and `api` when the behavior requires it.
- Prefer matching domain and slice names across apps so a capability can be traced end-to-end, for example `tasks/create-task` across `apps/web`, `apps/auth`, and `apps/api`.
- Keep framework entrypoints thin. Route files, handlers, and transport adapters should delegate into slice-owned logic quickly instead of accumulating business rules.
- Auth is a first-class layer. Identity, session, membership, permissions, and authorization checks should be modeled deliberately, not scattered across UI and handlers.
- Keep domain rules in one clear home and expose them through explicit interfaces or contracts instead of reimplementing them in multiple layers.
- Shared packages in `packages/*` are for true cross-cutting infrastructure such as design system, tooling, or stable shared contracts. Do not move feature logic there just because multiple apps need it.
- Extract feature code into a shared package only after there is a real second consumer or a clear platform boundary that justifies it.
- Not every feature needs code in every app. A slice should span only the layers it actually requires.
- For collaborative product state, prefer a sync-backed read model plus
  command-owned server mutations over RPC-only client state orchestration.
- Treat Postgres as the canonical system of record. Sync infrastructure may
  project authenticated subsets into clients, but permission-checked writes,
  AI-assisted workflows, and other side effects should still cross an app-owned
  command boundary.
- Follow the detailed architecture guidance in `docs/architecture/domain-driven-feature-slices.md`.
- Follow the locked sync and command boundary in
  `docs/superpowers/specs/2026-03-31-sync-read-model-and-command-boundary-decision.md`
  when working on collaborative task state.

## Local Source Mirrors

- Local dependency source mirrors live in `.opensrc/`.
- Use `pnpm bootstrap` for onboarding and `pnpm opensrc:sync` to refresh only the local mirrors.
- Check `.opensrc/sources.json` first and treat it as the authoritative index.
- Use the `path` field from `.opensrc/sources.json` instead of guessing folder names.
- Read the local mirror before using Context7 or other remote package lookup tools.
- Only use remote package lookup when the package is missing from `.opensrc/` or the local source is insufficient.

## AI Integration Notes

- OpenCode: `opencode.json` includes this file through the `instructions` field.
- Codex: project-local committed support uses this `AGENTS.md` file.
- Claude Code: committed project-local instructions live in the root `CLAUDE.md`, which should stay symlinked to this `AGENTS.md`; hook and MCP approval live in `.claude/settings.json` and `.mcp.json`. The hook is intentionally no-op until dependencies are installed and `pnpm exec ultracite` is available.
- GitHub Copilot and Cursor: read the canonical `AGENTS.md` instruction nodes directly, so no separate mirror file is maintained for them.
- Narrower subtree intent lives in `apps/AGENTS.md`, `apps/web/AGENTS.md`,
  `apps/api/AGENTS.md`, `apps/auth/AGENTS.md`, `packages/AGENTS.md`,
  `packages/db/AGENTS.md`, `packages/email/AGENTS.md`, `packages/ui/AGENTS.md`,
  and `docs/AGENTS.md`; when working in those areas, follow the closest
  matching node in addition to this root file.
- `.mcp.json` exists only to preserve the existing `shadcn` MCP server for Claude Code. Ultracite is configured through committed instruction files, not through MCP.
