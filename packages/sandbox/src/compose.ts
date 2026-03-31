import { join } from "node:path"

const SANDBOX_COMPOSE_FILES = {
  base: "infra/sandbox/compose.base.yml",
  hosted: "infra/sandbox/compose.hosted.yml",
  local: "infra/sandbox/compose.local.yml",
} as const

interface BuildComposeArgsOptions {
  envFilePath: string
  mode: "hosted" | "local"
  projectName: string
  repositoryRoot: string
  subcommand: string[]
}

const buildComposeArgs = ({
  envFilePath,
  mode,
  projectName,
  repositoryRoot,
  subcommand,
}: BuildComposeArgsOptions) => [
  "compose",
  "-f",
  join(repositoryRoot, SANDBOX_COMPOSE_FILES.base),
  "-f",
  join(
    repositoryRoot,
    mode === "local"
      ? SANDBOX_COMPOSE_FILES.local
      : SANDBOX_COMPOSE_FILES.hosted
  ),
  "--env-file",
  envFilePath,
  "--project-name",
  projectName,
  ...subcommand,
]

export { buildComposeArgs, SANDBOX_COMPOSE_FILES }
export type { BuildComposeArgsOptions }
