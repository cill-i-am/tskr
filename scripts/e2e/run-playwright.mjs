/* oxlint-disable import/no-relative-parent-imports, promise/avoid-new, promise/prefer-await-to-then, no-void */

import { spawn } from "node:child_process"
import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

import {
  E2E_PORTLESS_SERVICE_NAMES,
  assertHttpsPortlessServiceUrls,
  resolvePortlessServiceUrls,
} from "../lib/e2e-portless.mjs"
import { buildE2eSharedEnv } from "../lib/e2e-runner-env.mjs"
import { ensureLocalPostgresReady } from "../lib/local-postgres.mjs"

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0"

const repoRoot = new URL("../../", import.meta.url)
const rootDirectory = fileURLToPath(repoRoot)
const emailCaptureDirectory = join(
  rootDirectory,
  ".tmp",
  "e2e",
  "emails",
  `${Date.now()}`
)

const execute = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout?.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr?.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stderr,
        stdout,
      })
    })
  })

const assertCommandSucceeded = (command, args, result) => {
  if (result.code === 0) {
    return
  }

  const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim()
  const suffix = output.length > 0 ? `\n${output}` : ""

  throw new Error(`Command failed: ${command} ${args.join(" ")}${suffix}`)
}

const ensurePortlessReady = async () => {
  try {
    const result = await execute("portless", ["list"], {
      cwd: rootDirectory,
      env: process.env,
    })

    if (result.code !== 0) {
      throw new Error(result.stderr || result.stdout)
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(
        "Portless is not installed. Run `npm install -g portless` first.",
        { cause: error }
      )
    }

    throw new Error(
      [
        "Portless is not ready.",
        "Run `portless proxy start --https` and, if needed, `sudo portless hosts sync`.",
      ].join(" "),
      { cause: error }
    )
  }
}

const spawnManagedProcess = (command, args, env) => {
  const child = spawn(command, args, {
    cwd: rootDirectory,
    detached: true,
    env,
    stdio: "inherit",
  })

  return child
}

const sendManagedSignal = (child, signal) => {
  if (typeof child.pid === "number") {
    try {
      process.kill(-child.pid, signal)
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error && error.code === "ESRCH")
      ) {
        throw error
      }
    }

    return
  }

  child.kill(signal)
}

const stopManagedProcess = async (child) => {
  if (child.exitCode !== null || child.killed) {
    return
  }

  sendManagedSignal(child, "SIGTERM")

  const deadline = Date.now() + 10_000

  while (child.exitCode === null && Date.now() < deadline) {
    await delay(100)
  }

  if (child.exitCode === null) {
    sendManagedSignal(child, "SIGKILL")
  }
}

const waitForPortlessRoutes = async () => {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    const result = await execute("portless", ["list"], {
      cwd: rootDirectory,
      env: process.env,
    })

    if (result.code === 0) {
      try {
        return resolvePortlessServiceUrls(result.stdout)
      } catch {
        // Keep polling until both routes appear.
      }
    }

    await delay(1000)
  }

  throw new Error(
    `Timed out waiting for ${E2E_PORTLESS_SERVICE_NAMES.web} and ${E2E_PORTLESS_SERVICE_NAMES.auth} to register with Portless.`
  )
}

const waitForHealthcheck = async (baseUrl) => {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/up", baseUrl), {
        method: "GET",
      })

      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until the service is ready.
    }

    await delay(1000)
  }

  throw new Error(`Timed out waiting for ${baseUrl}/up to become ready.`)
}

const runPlaywright = async (playwrightArgs, env) =>
  await new Promise((resolve) => {
    const child = spawn(
      "pnpm",
      ["exec", "playwright", "test", ...playwrightArgs],
      {
        cwd: rootDirectory,
        env,
        stdio: "inherit",
      }
    )

    child.on("close", (code) => {
      resolve(code ?? 1)
    })
  })

const migrateLocalPostgres = async (env) => {
  const args = ["--filter", "@workspace/db", "db:migrate"]
  const result = await execute("pnpm", args, {
    cwd: rootDirectory,
    env,
  })

  assertCommandSucceeded("pnpm", args, result)
}

const main = async () => {
  await ensurePortlessReady()
  await rm(emailCaptureDirectory, {
    force: true,
    recursive: true,
  })
  await mkdir(emailCaptureDirectory, {
    recursive: true,
  })

  const database = await ensureLocalPostgresReady({
    repoRoot: rootDirectory,
  })
  const sharedEnv = buildE2eSharedEnv({
    baseEnv: process.env,
    databaseUrl: database.databaseUrl,
    emailCaptureDirectory,
  })

  await migrateLocalPostgres(sharedEnv)

  const devProcess = spawnManagedProcess(
    "pnpm",
    ["exec", "turbo", "run", "e2e:dev", "--filter=auth", "--filter=web"],
    sharedEnv
  )

  const shutdown = async () => {
    await stopManagedProcess(devProcess)
  }

  process.on("SIGINT", () => {
    void shutdown().finally(() => {
      process.exit(130)
    })
  })
  process.on("SIGTERM", () => {
    void shutdown().finally(() => {
      process.exit(143)
    })
  })

  try {
    const { authBaseUrl, webBaseUrl } = await waitForPortlessRoutes()
    assertHttpsPortlessServiceUrls({
      authBaseUrl,
      webBaseUrl,
    })

    await Promise.all([
      waitForHealthcheck(authBaseUrl),
      waitForHealthcheck(webBaseUrl),
    ])

    const exitCode = await runPlaywright(process.argv.slice(2), {
      ...sharedEnv,
      E2E_AUTH_BASE_URL: authBaseUrl,
      E2E_EMAIL_CAPTURE_DIR: emailCaptureDirectory,
      E2E_WEB_BASE_URL: webBaseUrl,
    })

    process.exitCode = exitCode
  } finally {
    await shutdown()
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
