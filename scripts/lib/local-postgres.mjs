import { realpath } from "node:fs/promises"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

import { deriveWorktreeDbConfig } from "./local-postgres-config.mjs"
import { runCommand } from "./run-command.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_REPO_ROOT = join(__dirname, "../..")
const DEFAULT_COMPOSE_FILE = join(
  DEFAULT_REPO_ROOT,
  "infra/postgres/compose.dev.yml"
)
const DEFAULT_HEALTHCHECK_INTERVAL_MS = 2000
const DEFAULT_HEALTHCHECK_RETRIES = 30
const DEFAULT_HEALTHCHECK_START_PERIOD_MS = 2000
const DEFAULT_HEALTH_TIMEOUT_BUFFER_MS = 15_000
const DEFAULT_HEALTH_INTERVAL_MS = 1000
export const deriveHealthcheckWindowMs = ({
  intervalMs = DEFAULT_HEALTHCHECK_INTERVAL_MS,
  retries = DEFAULT_HEALTHCHECK_RETRIES,
  startPeriodMs = DEFAULT_HEALTHCHECK_START_PERIOD_MS,
} = {}) => startPeriodMs + intervalMs * retries
export const deriveHealthTimeoutMs = ({
  bufferMs = DEFAULT_HEALTH_TIMEOUT_BUFFER_MS,
  intervalMs = DEFAULT_HEALTHCHECK_INTERVAL_MS,
  retries = DEFAULT_HEALTHCHECK_RETRIES,
  startPeriodMs = DEFAULT_HEALTHCHECK_START_PERIOD_MS,
} = {}) =>
  deriveHealthcheckWindowMs({ intervalMs, retries, startPeriodMs }) + bufferMs
const DEFAULT_HEALTH_TIMEOUT_MS = deriveHealthTimeoutMs()

export const buildComposeArgs = (composeFile, projectName, args = []) => [
  "compose",
  "-f",
  composeFile,
  "--project-name",
  projectName,
  ...args,
]

export const formatCommandFailure = (command, args, result) => {
  const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim()
  const suffix = output.length > 0 ? `\n${output}` : ""

  return `Command failed: ${command} ${args.join(" ")}${suffix}`
}

const assertCommandSucceeded = (command, args, result) => {
  if (result.code === 0) {
    return
  }

  throw new Error(formatCommandFailure(command, args, result))
}

export const resolveLocalPostgresConfig = async (
  repoRoot = DEFAULT_REPO_ROOT
) => {
  const canonicalPath = await realpath(repoRoot)

  return deriveWorktreeDbConfig(canonicalPath)
}

export const assertDockerAvailable = async () => {
  let dockerVersionResult

  try {
    dockerVersionResult = await runCommand("docker", ["--version"])
  } catch (error) {
    throw new Error(
      `Docker CLI is required for local Postgres. Install Docker and retry. (${error.message})`,
      { cause: error }
    )
  }

  assertCommandSucceeded("docker", ["--version"], dockerVersionResult)

  const dockerInfoResult = await runCommand("docker", ["info"])
  if (dockerInfoResult.code !== 0) {
    throw new Error(
      "Docker daemon is not reachable. Start Docker Desktop (or your daemon) and retry."
    )
  }
}

export const buildComposeEnv = (config) => ({
  ...process.env,
  POSTGRES_CONTAINER_NAME: config.containerName,
  POSTGRES_DB: config.database,
  POSTGRES_HOST_PORT: String(config.port),
  POSTGRES_IMAGE: config.image,
  POSTGRES_PASSWORD: config.password,
  POSTGRES_USER: config.user,
})

const getComposeContainerId = async ({ composeFile, config }) => {
  const args = buildComposeArgs(composeFile, config.projectName, [
    "ps",
    "-q",
    "postgres",
  ])
  const result = await runCommand("docker", args, {
    env: buildComposeEnv(config),
  })

  assertCommandSucceeded("docker", args, result)

  return result.stdout.trim()
}

const getContainerStatus = async (containerId) => {
  const args = [
    "inspect",
    "--format",
    "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
    containerId,
  ]
  const result = await runCommand("docker", args)
  assertCommandSucceeded("docker", args, result)

  return result.stdout.trim()
}

export const isHealthyContainerStatus = (status) => status === "healthy"

const getLocalPostgresStatus = async ({ composeFile, config }) => {
  const containerId = await getComposeContainerId({ composeFile, config })

  if (containerId.length === 0) {
    return "missing"
  }

  return getContainerStatus(containerId)
}

export const isLocalPostgresHealthy = async ({
  composeFile = DEFAULT_COMPOSE_FILE,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)

  try {
    const status = await getLocalPostgresStatus({ composeFile, config })

    return isHealthyContainerStatus(status)
  } catch {
    return false
  }
}

export const waitForLocalPostgresHealthy = async (
  { composeFile = DEFAULT_COMPOSE_FILE, config },
  {
    intervalMs = DEFAULT_HEALTH_INTERVAL_MS,
    timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
  } = {}
) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const containerId = await getComposeContainerId({ composeFile, config })

    if (containerId.length > 0) {
      const status = await getContainerStatus(containerId)

      if (status === "healthy") {
        return
      }

      if (status === "unhealthy") {
        throw new Error(
          `Local Postgres reported "unhealthy". Run "pnpm db:logs" for diagnostics (container: ${config.containerName}).`
        )
      }

      if (status === "dead" || status === "exited") {
        throw new Error(
          `Local Postgres container entered status "${status}". Run "pnpm db:logs" for diagnostics (container: ${config.containerName}).`
        )
      }
    }

    await delay(intervalMs)
  }

  throw new Error(
    `Timed out waiting for Postgres health (${Math.round(timeoutMs / 1000)}s). Run "pnpm db:logs" for diagnostics (container: ${config.containerName}).`
  )
}

export const ensureLocalPostgres = async ({
  composeFile = DEFAULT_COMPOSE_FILE,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)

  await assertDockerAvailable()

  const args = buildComposeArgs(composeFile, config.projectName, [
    "up",
    "-d",
    "postgres",
  ])
  const result = await runCommand("docker", args, {
    env: buildComposeEnv(config),
    stdio: "inherit",
  })

  assertCommandSucceeded("docker", args, result)
  await waitForLocalPostgresHealthy({ composeFile, config })

  return config
}

export const ensureLocalPostgresReady = async ({
  composeFile = DEFAULT_COMPOSE_FILE,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)
  const healthy = await isLocalPostgresHealthy({ composeFile, repoRoot })

  if (healthy) {
    return config
  }

  return ensureLocalPostgres({ composeFile, repoRoot })
}

export const downLocalPostgres = async ({
  composeFile = DEFAULT_COMPOSE_FILE,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)

  await assertDockerAvailable()

  const args = buildComposeArgs(composeFile, config.projectName, [
    "down",
    "--remove-orphans",
  ])
  const result = await runCommand("docker", args, {
    env: buildComposeEnv(config),
    stdio: "inherit",
  })

  assertCommandSucceeded("docker", args, result)

  return config
}

export const resetLocalPostgres = async ({
  composeFile = DEFAULT_COMPOSE_FILE,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)

  await assertDockerAvailable()

  const downArgs = buildComposeArgs(composeFile, config.projectName, [
    "down",
    "--remove-orphans",
    "--volumes",
  ])
  const downResult = await runCommand("docker", downArgs, {
    env: buildComposeEnv(config),
    stdio: "inherit",
  })
  assertCommandSucceeded("docker", downArgs, downResult)

  const upArgs = buildComposeArgs(composeFile, config.projectName, [
    "up",
    "-d",
    "postgres",
  ])
  const upResult = await runCommand("docker", upArgs, {
    env: buildComposeEnv(config),
    stdio: "inherit",
  })
  assertCommandSucceeded("docker", upArgs, upResult)

  await waitForLocalPostgresHealthy({ composeFile, config })

  return config
}

export const streamLocalPostgresLogs = async ({
  composeFile = DEFAULT_COMPOSE_FILE,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)

  await assertDockerAvailable()

  const args = buildComposeArgs(composeFile, config.projectName, [
    "logs",
    "--follow",
    "--tail",
    "200",
    "postgres",
  ])
  const result = await runCommand("docker", args, {
    env: buildComposeEnv(config),
    stdio: "inherit",
  })

  assertCommandSucceeded("docker", args, result)

  return config
}

export const getLocalDatabaseUrl = async ({
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) => {
  const config = await resolveLocalPostgresConfig(repoRoot)

  return config.databaseUrl
}
