import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  ELECTRIC_DEFAULT_PUBLICATION_NAME,
  SYNCED_AUTH_REPLICATION_TABLES,
} from "./replication.ts"

test("db package exposes the proving-slice synced auth tables", () => {
  assert.equal(
    ELECTRIC_DEFAULT_PUBLICATION_NAME,
    "electric_publication_default"
  )
  assert.deepEqual(SYNCED_AUTH_REPLICATION_TABLES, [
    "auth.organization",
    "auth.user",
    "auth.member",
    "auth.invitation",
  ])
})

test("custom migration prepares the proving-slice auth tables for replication", async () => {
  const migration = await readFile(
    new URL(
      "../drizzle/0003_enable_synced_auth_table_replication.sql",
      import.meta.url
    ),
    "utf8"
  )

  assert.match(migration, /CREATE PUBLICATION "electric_publication_default"/)

  for (const tableName of SYNCED_AUTH_REPLICATION_TABLES) {
    const [schemaName, relationName] = tableName.split(".")
    const escapedTable = `"${schemaName}"\\."${relationName}"`

    assert.match(
      migration,
      new RegExp(
        `ALTER PUBLICATION "electric_publication_default"\\s+ADD TABLE ${escapedTable}`
      )
    )
    assert.match(
      migration,
      new RegExp(`ALTER TABLE ${escapedTable} REPLICA IDENTITY FULL`)
    )
  }
})
