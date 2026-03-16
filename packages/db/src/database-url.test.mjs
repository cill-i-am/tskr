import assert from "node:assert/strict"
import test from "node:test"

import { resolveDatabaseUrl } from "./database-url.ts"

const setEnvironment = (values) => {
  const originalEnvironment = process.env
  const nextEnvironment = Object.fromEntries(
    Object.entries({
      ...originalEnvironment,
      ...values,
    }).filter(([, value]) => value !== undefined)
  )

  process.env = nextEnvironment

  return () => {
    process.env = originalEnvironment
  }
}

test("resolveDatabaseUrl prefers explicit options URL", () => {
  const url = resolveDatabaseUrl({
    databaseUrl: "postgres://explicit",
    env: { DATABASE_URL: "postgres://env" },
  })

  assert.equal(url, "postgres://explicit")
})

test("resolveDatabaseUrl falls back to env DATABASE_URL", () => {
  const url = resolveDatabaseUrl({
    env: { DATABASE_URL: "postgres://env" },
  })

  assert.equal(url, "postgres://env")
})

test("resolveDatabaseUrl falls back to process.env by default", () => {
  const restoreEnvironment = setEnvironment({
    DATABASE_URL: "postgres://process-env",
  })

  try {
    const url = resolveDatabaseUrl()

    assert.equal(url, "postgres://process-env")
  } finally {
    restoreEnvironment()
  }
})

test("resolveDatabaseUrl throws when no URL is available", () => {
  assert.throws(() => resolveDatabaseUrl({ env: {} }), {
    message: "DATABASE_URL must be set",
  })
})
