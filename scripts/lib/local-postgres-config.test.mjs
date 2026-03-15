import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_POSTGRES_DATABASE,
  DEFAULT_POSTGRES_HOST,
  DEFAULT_POSTGRES_IMAGE,
  DEFAULT_POSTGRES_PASSWORD,
  DEFAULT_POSTGRES_USER,
  deriveDeterministicPort,
  deriveWorktreeDbConfig,
  deriveWorktreeIdentity,
} from "./local-postgres-config.mjs"

test("deriveWorktreeIdentity is deterministic for canonical paths", () => {
  const first = deriveWorktreeIdentity("/Users/example/repo")
  const second = deriveWorktreeIdentity("/Users/example/repo")

  assert.equal(first.canonicalPath, "/Users/example/repo")
  assert.equal(second.canonicalPath, "/Users/example/repo")
  assert.equal(first.hashHex, second.hashHex)
  assert.equal(first.projectName, second.projectName)
})

test("deriveWorktreeIdentity differentiates two worktree paths", () => {
  const main = deriveWorktreeIdentity("/Users/example/repo")
  const worktree = deriveWorktreeIdentity("/Users/example/repo/.worktrees/feature")

  assert.notEqual(main.hashHex, worktree.hashHex)
  assert.notEqual(main.projectName, worktree.projectName)
})

test("deriveDeterministicPort returns a stable port in the supported range", () => {
  const port = deriveDeterministicPort("9f011f3b7ad12e")

  assert.equal(deriveDeterministicPort("9f011f3b7ad12e"), port)
  assert.ok(port >= 20000)
  assert.ok(port <= 29999)
})

test("deriveWorktreeDbConfig returns defaults and DATABASE_URL", () => {
  const config = deriveWorktreeDbConfig("/Users/example/repo")

  assert.equal(config.host, DEFAULT_POSTGRES_HOST)
  assert.equal(config.database, DEFAULT_POSTGRES_DATABASE)
  assert.equal(config.user, DEFAULT_POSTGRES_USER)
  assert.equal(config.password, DEFAULT_POSTGRES_PASSWORD)
  assert.equal(config.image, DEFAULT_POSTGRES_IMAGE)
  assert.match(
    config.databaseUrl,
    /^postgresql:\/\/postgres:[\w-]+@127\.0\.0\.1:\d+\/app\?schema=public$/
  )
  assert.match(config.projectName, /^tskr-postgres-[a-f0-9]{10}$/)
  assert.match(config.containerName, /^tskr-postgres-[a-f0-9]{10}-db$/)
})
