# Claude Code Project Instructions

Follow the root `AGENTS.md` file as the primary project instruction source.

Additional Claude-specific expectations:

- After `Write` or `Edit` operations, the project hook may run `pnpm exec ultracite fix` from the repo root once dependencies are installed.
- Keep changes compatible with the root `.oxlintrc.json` and `.oxfmtrc.jsonc`.
- Prefer minimal diffs that let Ultracite own formatting, import ordering, and Tailwind class ordering.
