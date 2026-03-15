import assert from "node:assert/strict"
import test from "node:test"

import {
  buildLocalPostgresChildEnv,
  parseLauncherCommandArgs,
} from "./local-postgres-launcher.mjs"

test("parseLauncherCommandArgs returns command and args after separator", () => {
  const command = parseLauncherCommandArgs([
    "node",
    "scripts/dev/local-postgres-launcher.mjs",
    "--",
    "tsx",
    "watch",
    "src/index.ts",
  ])

  assert.deepEqual(command, {
    args: ["watch", "src/index.ts"],
    command: "tsx",
  })
})

test("parseLauncherCommandArgs throws when no command is provided", () => {
  assert.throws(
    () =>
      parseLauncherCommandArgs([
        "node",
        "scripts/dev/local-postgres-launcher.mjs",
      ]),
    new Error(
      'Expected a child command after "--". Example: node scripts/dev/local-postgres-launcher.mjs -- tsx watch src/index.ts'
    )
  )
})

test("buildLocalPostgresChildEnv adds DATABASE_URL to the child environment", () => {
  const env = buildLocalPostgresChildEnv({
    baseEnv: {
      FOO: "bar",
    },
    databaseUrl: "postgresql://postgres:postgres@127.0.0.1:25432/app",
  })

  assert.equal(env.FOO, "bar")
  assert.equal(
    env.DATABASE_URL,
    "postgresql://postgres:postgres@127.0.0.1:25432/app"
  )
})
