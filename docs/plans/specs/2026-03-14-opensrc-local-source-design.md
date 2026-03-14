# Local OpenSrc Mirrors Design

## Goal

Add an automated, repo-owned workflow that fetches source code for a curated set of high-value third-party packages into a local ignored `.opensrc/` directory so developers and agents can inspect implementation details without checking those sources into GitHub.

## Context

- This repo is a pnpm monorepo with `apps/web` and `packages/ui`.
- The main third-party packages that are most likely to benefit agents here are:
  - `react`
  - `react-dom`
  - `@tanstack/react-router`
  - `@tanstack/react-start`
  - `zod`
  - `@base-ui/react`
- `opensrc` already supports lockfile-aware package fetching, source indexing, and agent-facing guidance, but its default behavior assumes an `opensrc/` directory and interactive file modifications.
- This repo wants the same benefit with a hidden local-only directory, no checked-in mirrored source, and explicit agent instructions to use local mirrored source before spending tokens on remote package context lookups.

## Requirements

### Functional

- Fetch source for a curated allowlist of important packages.
- Store fetched source in `.opensrc/`, not `opensrc/`.
- Keep `.opensrc/` untracked by git.
- Make the sync process easy for new developers to get automatically during setup.
- Make the sync process idempotent so re-running updates versions to match the lockfile.
- Teach agents to check `.opensrc/sources.json` and mirrored package folders before using remote docs/context tools.

### Non-Functional

- Do not make `pnpm install` brittle if network access, git, or upstream repo metadata is unavailable.
- Avoid interactive prompts during automation.
- Keep the package selection high-signal and easy to review.
- Keep repo changes small and consistent with existing root-level tooling.

## Recommended Approach

Use a tracked curated config, a pinned root `opensrc` dev dependency, and a repo-managed Node sync script that rebuilds `.opensrc/` atomically.

### Why this approach

- A curated list stays focused on packages whose internals matter for day-to-day work.
- A Node script is easier to keep portable and testable than shell glue.
- Explicit repo-managed edits are safer than letting `opensrc` mutate files interactively.
- A hidden `.opensrc/` directory matches the requirement that the local mirror should exist for developer benefit without becoming part of the normal repo surface area.

## Alternatives Considered

### 1. Curated allowlist with sync script (recommended)

- Pros: predictable, low-noise, easy agent guidance, easy review in PRs.
- Cons: package list must be maintained when priorities change.

### 2. Derived package list from workspace manifests

- Pros: less manual maintenance.
- Cons: fetches too many low-value packages, harder to reason about, higher setup cost, worse signal for agents.

### 3. Manual opt-in sync command only

- Pros: simplest install path.
- Cons: misses the goal that new developers should get the benefit automatically.

## Architecture

### 1. Source manifest

Add a tracked config file at `opensrc.packages.json` that defines the curated package set. Example shape:

```json
{
  "packages": [
    "react",
    "react-dom",
    "@tanstack/react-router",
    "@tanstack/react-start",
    "zod",
    "@base-ui/react"
  ]
}
```

This file is the single source of truth for what should be mirrored locally.

### 2. Sync script

Add a root script at `scripts/sync-opensrc.mjs` that:

- reads `opensrc.packages.json`
- runs from the repo root so lockfile detection stays correct
- invokes the pinned local CLI with `pnpm exec opensrc ... --modify=false --cwd <repo-root>`
- relies on upstream to write into a transient repo-root `opensrc/` directory, because upstream currently hardcodes that path
- atomically promotes the transient `opensrc/` directory to `.opensrc/` only after validation succeeds
- preserves the previous `.opensrc/` mirror if the sync fails

The sync algorithm should be:

1. remove any stale transient `opensrc/` directory left from a previous interrupted run
2. rename existing `.opensrc/` to a temporary backup directory
3. run `pnpm exec opensrc <configured-packages> --modify=false --cwd <repo-root>`
4. validate that `opensrc/sources.json` exists and contains successful entries for every configured package
5. rename `opensrc/` to `.opensrc/`
6. remove the backup on success
7. if any step fails, remove the transient `opensrc/` directory and restore the backup

This design keeps `.opensrc/` authoritative while still working with the upstream CLI.

### 3. Setup entrypoint

Expose two root commands:

- `pnpm opensrc:sync` runs the sync in strict mode
- `pnpm setup` runs the sync in onboarding mode

The repo should not use `postinstall`.

Rationale:

- `postinstall` adds network work to every install and is harder to keep reliable in CI and offline environments
- `pnpm setup` still gives new developers an automated workflow without asking them to learn `opensrc` details
- a strict `opensrc:sync` command gives maintainers a deterministic verification path when changing the curated package set or sync logic

Command contracts:

- `pnpm opensrc:sync` exits `0` only when every configured package was fetched and the promoted `.opensrc/sources.json` matches the manifest
- `pnpm opensrc:sync` exits non-zero on any fetch, validation, or promotion failure
- `pnpm setup` invokes the same script with `--soft-fail`; it prints warnings on failure but still exits `0`

### 4. Repo-owned ignore and TypeScript exclusions

Do not rely on `opensrc` to modify project files. Make the repo-owned changes directly:

- add `.opensrc/` and any temporary backup directory used by the sync script to `.gitignore`
- exclude `.opensrc/` from root and package TypeScript configs where needed so mirrored source is not typechecked or bundled by accident

The current repo has a root `tsconfig.json` and package-level configs in `apps/web` and `packages/ui`, so the plan should update each config that could otherwise include repo-root hidden directories through broad include patterns.

### 5. Agent instructions

Add a short section to `AGENTS.md` that tells agents:

- local mirrored dependency source lives in `.opensrc/`
- `.opensrc/sources.json` is the authoritative index of what is available locally
- agents must use the `path` value from `.opensrc/sources.json` to locate a mirrored package instead of guessing a folder name
- when debugging or reasoning about dependency internals, read the indexed local mirror before using remote package docs
- use Context7 or other remote package lookup tools only when the package is not mirrored locally or local source does not answer the question

This instruction should mention Context7 by name because that is the explicit token-saving goal.

## File-Level Design

### Expected new files

- `opensrc.packages.json` root manifest for the curated package list
- `scripts/sync-opensrc.mjs` root Node sync script
- a short human-facing docs update describing `pnpm setup`, `pnpm opensrc:sync`, and `.opensrc/`

### Expected modified files

- `.gitignore` to ignore `.opensrc/`
- `package.json` to add sync/setup scripts
- `AGENTS.md` to teach agents to check `.opensrc/` before Context7
- `tsconfig.json` and possibly workspace tsconfig files if explicit exclusion is needed
- `README.md` to document `pnpm setup`, `pnpm opensrc:sync`, and the purpose of `.opensrc/`

### Expected generated local-only files

- `.opensrc/sources.json`
- `.opensrc/settings.json`
- `.opensrc/repos/<host>/<owner>/<repo>/...`

Generated local-only files must remain ignored.

### `.opensrc/` directory contract

- `.opensrc/sources.json` is the only authoritative index
- each package entry includes `name`, `version`, `registry`, and `path`
- each `path` value is relative to `.opensrc/`
- scoped package names are not mapped to paths by string replacement; code and agents must consult the index entry
- agents and helper code must treat `.opensrc/sources.json` as the contract, not assumptions about folder names

## Operational Details

### Sync behavior

- Re-running sync should rebuild `.opensrc/` from the curated manifest and refresh versions from `pnpm-lock.yaml`.
- The script should only target configured packages.
- The script should be safe to run repeatedly from a clean or dirty working tree.
- Packages removed from `opensrc.packages.json` must disappear from `.opensrc/sources.json` and from the on-disk mirror after the next successful sync.
- Stale mirror content is cleaned by whole-directory rebuild, not piecemeal pruning.

### Failure handling

- The sync script should attempt all configured packages in one invocation when possible.
- If one or more packages fail, `pnpm opensrc:sync` must exit non-zero and restore the previous `.opensrc/` mirror.
- If the `opensrc` CLI itself is unavailable, print a clear remediation message and exit according to the active mode.
- If the network is unavailable, `pnpm opensrc:sync` exits non-zero and `pnpm setup` logs a warning then exits `0`.
- Partial fetches must never replace a previously valid `.opensrc/` mirror.

### Performance

- Keep the initial curated list small.
- Prefer one batched invocation of `opensrc` when that produces equivalent output.
- Accept whole-directory rebuild cost because the curated list is intentionally small and the simpler cleanup semantics are worth it.

## Testing Strategy

The implementation plan should include:

- config-level verification that `.opensrc/` is gitignored and tsconfig-excluded
- script-level verification that the sync command runs from repo root and uses the curated manifest
- behavior verification that the script is non-interactive in both modes
- behavior verification that strict mode exits non-zero and preserves the prior mirror on fetch, validation, or promotion errors
- behavior verification that onboarding mode logs warnings and exits `0` on the same failures
- a smoke test that `.opensrc/sources.json` is produced after a successful sync
- documentation verification that `AGENTS.md` mentions `.opensrc/` and checking local mirrored source before Context7

Tests can combine unit coverage for manifest/script helpers with one lightweight integration-style command check.

## Out of Scope

- Automatic discovery of all third-party dependencies
- Mirroring every dev dependency in the repo
- Checking mirrored package source into git
- Replacing all external documentation workflows; remote docs still matter when local source is absent or insufficient
- Broader agent-instruction refactors unrelated to local dependency source lookup

## Locked Implementation Decisions

- onboarding uses `pnpm setup`, not `postinstall`
- maintainers get a strict `pnpm opensrc:sync` command for validation and reruns
- the repo adds a pinned root dev dependency on `opensrc`
- `.opensrc/` support is implemented by running upstream against a transient `opensrc/` directory, validating the result, then atomically promoting it to `.opensrc/`
- `.opensrc/sources.json` is the authoritative index and path contract
- stale mirrored content is removed through whole-directory rebuild on successful sync
- package-level and root-level tsconfig files should be updated wherever their include patterns could pull `.opensrc/` into the TypeScript program

## Success Criteria

- A new developer can clone the repo, run the documented setup flow, and end up with `.opensrc/` populated locally without manual `opensrc` commands.
- `.opensrc/` never appears in git status after setup.
- Agents are instructed to inspect `.opensrc/` first for dependency internals.
- The curated list remains small, readable, and easy to update.
- Setup stays resilient when source fetching is partially or fully unavailable.
