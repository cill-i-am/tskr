import assert from "node:assert/strict"
import test from "node:test"

import { authDatabaseSchema, session } from "./auth.ts"

test("authDatabaseSchema exposes Better Auth organization tables", () => {
  assert.equal(typeof authDatabaseSchema.organization, "object")
  assert.equal(typeof authDatabaseSchema.member, "object")
  assert.equal(typeof authDatabaseSchema.invitation, "object")
})

test("session schema includes active organization support", () => {
  assert.equal(typeof session.activeOrganizationId, "object")
})
