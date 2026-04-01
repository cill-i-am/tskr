# Knip Monorepo Integration Design

## Goal

Add Knip to the monorepo as a standard root quality check so `pnpm check`
fails on unused dependencies, exports, and files alongside the existing Turbo
workspace checks.

## Current Context

The repository is a pnpm workspace monorepo with root scripts that orchestrate
quality checks through Turbo. Package-level `check` scripts already exist for
Ultracite/Oxlint coverage, while the root `check` script is the user-facing
entrypoint for standard verification. This makes the root package the natural
place to install and invoke Knip.

The workspace layout is declared in `pnpm-workspace.yaml` and follows the
standard `apps/*` and `packages/*` pattern. That matches Knip's built-in
workspace support, so the repo should use one root Knip config rather than
duplicated package-local configs.

## Decision

Install `knip` as a root development dependency, add a root `knip` script, and
make the root `check` script run Knip before the existing Turbo `check` flow.

Create a single root Knip config file that:

- Treats the repository as a pnpm workspace monorepo
- Configures the root workspace as `"."`
- Adds workspace-specific `entry` and `project` patterns only where Knip needs
  help understanding the repo shape
- Prefers narrow, explicit configuration over broad ignore lists

This follows Knip's current monorepo guidance: in workspace repos, `entry` and
`project` belong under `workspaces`, and the root workspace is configured as
`"."`. Sources: [Monorepos & Workspaces](https://knip.dev/features/monorepos-and-workspaces),
[Configuration](https://knip.dev/reference/configuration), and
[Configuration Hints](https://knip.dev/reference/configuration-hints).

## Alternatives Considered

### 1. Dedicated Turbo `knip` task

This would make Knip look more like the existing package tasks, but it adds
task-layer complexity without clear value for a single root-owned tool. Knip
already understands pnpm workspaces, so a root script is sufficient.

### 2. Separate Knip configs per package

This would increase maintenance cost and duplicate configuration across the
monorepo. Since Knip already models workspaces natively, separate package
configs would fight the tool instead of using its intended monorepo mode.

## Expected Changes

- Update the root `package.json` to add:
  - `knip` in `devDependencies`
  - a `knip` script
  - root `check` integration
- Add a root `knip.json`
- Optionally document the new root check behavior in `README.md` if the command
  list or workflow notes would otherwise become stale

## Verification Strategy

Because this is a tooling/configuration integration rather than a product
behavior change, command-based verification is the right test surface:

- Run `pnpm knip`
- Refine the Knip config until the output is actionable and intentional
- Run `pnpm check`
- Run `pnpm exec ultracite fix` from the repo root per repo instructions

## Risks And Mitigations

### Risk: noisy false positives from generated files or framework conventions

Mitigation: start with minimal workspace-aware config and only add targeted
entries or ignores when Knip identifies a concrete mismatch.

### Risk: root-only dependencies appear unused or unlisted across workspaces

Mitigation: rely on Knip's first-class workspace support instead of strict mode,
and keep the root invocation as the canonical monorepo analysis path.

### Risk: `pnpm check` becomes harder to green during rollout

Mitigation: complete the initial config tuning in the same change so the new
gate lands in a passing state rather than introducing follow-up cleanup debt.
