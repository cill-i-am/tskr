import { spawn } from "node:child_process"
import { once } from "node:events"

import {
  FORWARDED_SIGNALS,
  buildLocalPostgresChildEnv,
  parseLauncherCommandArgs,
} from "./lib/local-postgres-launcher.mjs"
import { ensureLocalPostgresReady } from "./lib/local-postgres.mjs"

const run = async () => {
  const { args, command } = parseLauncherCommandArgs()
  const config = await ensureLocalPostgresReady()
  const child = spawn(command, args, {
    env: buildLocalPostgresChildEnv({
      baseEnv: process.env,
      databaseUrl: config.databaseUrl,
    }),
    stdio: "inherit",
  })

  const signalHandlers = FORWARDED_SIGNALS.map((signal) => {
    const handler = () => {
      if (!child.killed) {
        child.kill(signal)
      }
    }

    process.on(signal, handler)

    return { handler, signal }
  })

  const result = await Promise.race([
    once(child, "close").then(([code, signal]) => ({
      code: code ?? 1,
      signal,
    })),
    once(child, "error").then(([error]) => {
      throw error
    }),
  ])

  for (const { handler, signal } of signalHandlers) {
    process.off(signal, handler)
  }

  if (typeof result.signal === "string") {
    process.kill(process.pid, result.signal)

    return
  }

  process.exitCode = result.code
}

try {
  await run()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
