# Ultracite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ESLint and Prettier with Ultracite using Oxlint and Oxfmt across the monorepo, including import ordering, Tailwind class sorting, and AI agent integrations for Copilot, OpenCode, Codex, and Claude.

**Architecture:** Move linting and formatting to a single root-level Ultracite configuration so both workspaces share one toolchain. Preserve the repo's existing formatting preferences where practical, explicitly configure Oxfmt sorting behavior, and add project-local AI rule and hook files instead of relying on ad hoc editor setup.

**Tech Stack:** pnpm workspace, Turborepo, TanStack Start, React, TypeScript, Tailwind CSS v4, Ultracite, Oxlint, Oxfmt

---

### Task 1: Add root Ultracite, Oxlint/Oxfmt, and AI integration config

**Files:**

- Create: `.oxlintrc.json`
- Create: `.oxfmtrc.jsonc`
- Create: `.mcp.json`
- Create: `.claude/settings.json`
- Create: `AGENTS.md`
- Modify: `opencode.json`
- Modify: `package.json`

**Step 1: Write the failing test**

Use config-presence checks as the failing test:

```bash
test -f .oxlintrc.json && test -f .oxfmtrc.jsonc && test -f AGENTS.md
```

**Step 2: Run test to verify it fails**

Run: `test -f .oxlintrc.json && test -f .oxfmtrc.jsonc && test -f AGENTS.md`
Expected: FAIL because the Ultracite config files do not exist yet.

**Step 3: Write minimal implementation**

Create root config files that:

- install Ultracite as a root dev dependency in `package.json`
- extend Ultracite Oxlint `core` and `react` presets in `.oxlintrc.json`
- preserve repo formatting choices in `.oxfmtrc.jsonc` (`semi: false`, `singleQuote: false`, `trailingComma: "es5"`, `printWidth: 80`, `tabWidth: 2`, `endOfLine: "lf"`)
- enable `sortImports` with `@workspace/` marked internal
- enable `sortTailwindcss` with Tailwind v4 stylesheet `packages/ui/src/styles/globals.css` and functions `cn`, `cva`, `clsx`
- add Ultracite AI rules content to `AGENTS.md`
- update `opencode.json` to include Ultracite MCP/rules if supported alongside existing shadcn MCP config
- add project-local Claude config in `.claude/settings.json` to run `pnpm ultracite fix` after edits if hook format is supported
- add `.mcp.json` if needed for Claude MCP support
- add Codex/Copilot-facing project instructions in committed files where possible; if Codex requires only user-global config, document that limitation in `AGENTS.md`

**Step 4: Run test to verify it passes**

Run: `test -f .oxlintrc.json && test -f .oxfmtrc.jsonc && test -f AGENTS.md`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json .oxlintrc.json .oxfmtrc.jsonc opencode.json .claude/settings.json .mcp.json AGENTS.md
git commit -m "chore: add ultracite root configuration"
```

### Task 2: Replace old scripts and remove ESLint/Prettier configuration

**Files:**

- Modify: `package.json`
- Modify: `turbo.json`
- Modify: `apps/web/package.json`
- Modify: `packages/ui/package.json`
- Delete: `.prettierrc`
- Delete: `apps/web/eslint.config.js`
- Delete: `packages/ui/eslint.config.ts`

**Step 1: Write the failing test**

Use content checks for legacy config:

```bash
test -f .prettierrc && test -f apps/web/eslint.config.js && test -f packages/ui/eslint.config.ts
```

**Step 2: Run test to verify it fails correctly**

Run: `test -f .prettierrc && test -f apps/web/eslint.config.js && test -f packages/ui/eslint.config.ts`
Expected: PASS initially, proving the legacy files are still present and need removal.

**Step 3: Write minimal implementation**

Update scripts so that:

- root `package.json` adds `check`, `fix`, `lint`, and `format` commands backed by Ultracite instead of Turbo package-level lint/format tasks
- root `package.json` removes `prettier` and `prettier-plugin-tailwindcss`
- `apps/web/package.json` removes local `lint` and `format` scripts and `eslint`/`@tanstack/eslint-config` dev dependencies
- `packages/ui/package.json` removes local `lint` and `format` scripts and `eslint`/`@tanstack/eslint-config` dev dependencies
- `turbo.json` is updated so root-only `check`/`fix` tasks are available and obsolete package lint/format dependency chains are removed or simplified
- delete `.prettierrc`, `apps/web/eslint.config.js`, and `packages/ui/eslint.config.ts`

**Step 4: Run test to verify it passes**

Run: `! test -f .prettierrc && ! test -f apps/web/eslint.config.js && ! test -f packages/ui/eslint.config.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json turbo.json apps/web/package.json packages/ui/package.json .prettierrc apps/web/eslint.config.js packages/ui/eslint.config.ts
git commit -m "chore: replace eslint and prettier scripts"
```

### Task 3: Install, verify migration behavior, and document follow-up limits

**Files:**

- Modify: `package.json`
- Modify: `README.md`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/src/routeTree.gen.ts` (only if generated-file disable comments must change or file must be ignored)

**Step 1: Write the failing test**

Use CLI verification commands as failing tests:

```bash
pnpm ultracite doctor && pnpm check && pnpm fix --check
```

**Step 2: Run test to verify it fails**

Run: `pnpm ultracite doctor`
Expected: likely FAIL before dependency install or before config is fully wired.

**Step 3: Write minimal implementation**

Complete installation and verification work:

- run `pnpm install`
- run `pnpm ultracite doctor`
- run `pnpm check`
- run `pnpm fix`
- inspect resulting diffs to verify import sorting and Tailwind sorting occurred in representative files
- if `apps/web/src/routeTree.gen.ts` causes stale `eslint-disable` issues, either update the directive appropriately or ignore that generated file via config
- add brief README guidance for the new commands and note any remaining limitation, especially if Codex support cannot be committed project-locally and instead must be documented

**Step 4: Run test to verify it passes**

Run: `pnpm ultracite doctor && pnpm check`
Expected: PASS, unless blocked by known pre-existing repo issues; if blocked, clearly document the remaining failure and prove Ultracite itself is configured correctly.

**Step 5: Commit**

```bash
git add package.json README.md pnpm-lock.yaml apps/web/src/routeTree.gen.ts
git commit -m "chore: verify ultracite migration"
```
