import { spawn } from "node:child_process"

import { ensureLocalPostgresReady } from "../lib/local-postgres.mjs"
import {
  FORWARDED_SIGNALS,
  buildLocalPostgresChildEnv,
  parseLauncherCommandArgs,
} from "../lib/local-postgres-launcher.mjs"

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

  const childResult = await new Promise((resolve, reject) => {
    child.on("error", (error) => {
      reject(error)
    })
    child.on("close", (code, signal) => {
      resolve({ code, signal })
    })
  })

  for (const { handler, signal } of signalHandlers) {
    process.off(signal, handler)
  }

  if (typeof childResult.signal === "string") {
    process.kill(process.pid, childResult.signal)
    return
  }

  process.exitCode = childResult.code ?? 1
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
