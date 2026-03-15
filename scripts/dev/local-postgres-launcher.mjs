import { spawn } from "node:child_process"

import { ensureLocalPostgres } from "../lib/local-postgres.mjs"
import {
  buildLocalPostgresChildEnv,
  parseLauncherCommandArgs,
} from "../lib/local-postgres-launcher.mjs"

const run = async () => {
  const { args, command } = parseLauncherCommandArgs()
  const config = await ensureLocalPostgres()
  const child = spawn(command, args, {
    env: buildLocalPostgresChildEnv({
      baseEnv: process.env,
      databaseUrl: config.databaseUrl,
    }),
    stdio: "inherit",
  })

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", (error) => {
      reject(error)
    })
    child.on("close", (code) => {
      resolve(code ?? 1)
    })
  })

  process.exitCode = exitCode
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
