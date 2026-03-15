import assert from "node:assert/strict"
import test from "node:test"

import {
  buildComposeArgs,
  buildComposeEnv,
  formatCommandFailure,
} from "./local-postgres.mjs"

test("buildComposeArgs builds a docker compose argv with project name", () => {
  const args = buildComposeArgs(
    "/repo/infra/postgres/compose.dev.yml",
    "tskr-postgres-abc123",
    ["up", "-d", "postgres"]
  )

  assert.deepEqual(args, [
    "compose",
    "-f",
    "/repo/infra/postgres/compose.dev.yml",
    "--project-name",
    "tskr-postgres-abc123",
    "up",
    "-d",
    "postgres",
  ])
})

test("formatCommandFailure includes command and output when present", () => {
  const message = formatCommandFailure("docker", ["compose", "up"], {
    code: 1,
    stderr: "boom",
    stdout: "details",
  })

  assert.equal(
    message,
    "Command failed: docker compose up\nboom\ndetails"
  )
})

test("formatCommandFailure omits output suffix when output is empty", () => {
  const message = formatCommandFailure("docker", ["info"], {
    code: 1,
    stderr: "",
    stdout: "",
  })

  assert.equal(message, "Command failed: docker info")
})

test("buildComposeEnv maps config into compose environment variables", () => {
  const env = buildComposeEnv({
    containerName: "tskr-postgres-abc123-db",
    database: "app",
    image: "postgres:16-alpine",
    password: "postgres",
    port: 25432,
    user: "postgres",
  })

  assert.equal(env.POSTGRES_CONTAINER_NAME, "tskr-postgres-abc123-db")
  assert.equal(env.POSTGRES_DB, "app")
  assert.equal(env.POSTGRES_HOST_PORT, "25432")
  assert.equal(env.POSTGRES_IMAGE, "postgres:16-alpine")
  assert.equal(env.POSTGRES_PASSWORD, "postgres")
  assert.equal(env.POSTGRES_USER, "postgres")
})
