import {
  downLocalPostgres,
  ensureLocalPostgresReady,
  getLocalDatabaseUrl,
  resetLocalPostgres,
  streamLocalPostgresLogs,
} from "../lib/local-postgres.mjs"

const command = process.argv[2] ?? "ensure"

const run = async () => {
  if (command === "ensure") {
    const config = await ensureLocalPostgresReady()

    console.log(`Local Postgres ready on ${config.host}:${config.port}`)
    console.log(`DATABASE_URL=${config.databaseUrl}`)

    return
  }

  if (command === "down") {
    await downLocalPostgres()
    console.log("Local Postgres stopped")

    return
  }

  if (command === "reset") {
    const config = await resetLocalPostgres()

    console.log("Local Postgres reset")
    console.log(`DATABASE_URL=${config.databaseUrl}`)

    return
  }

  if (command === "logs") {
    await streamLocalPostgresLogs()

    return
  }

  if (command === "url") {
    const databaseUrl = await getLocalDatabaseUrl()

    console.log(databaseUrl)

    return
  }

  throw new Error(
    `Unknown command "${command}". Use one of: ensure, down, reset, logs, url`
  )
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
