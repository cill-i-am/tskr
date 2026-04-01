/* eslint-disable jest/expect-expect, jest/require-top-level-describe */

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import * as syncContractsPackage from "./index.ts"
import { syncContractsApi } from "./index.ts"

test("root export surface is explicit and sync-contract specific", () => {
  assert.deepEqual(Object.keys(syncContractsPackage).toSorted(), [
    "syncContractsApi",
    "syncContractsCreateWorkspaceInviteRequestSchema",
    "syncContractsCreateWorkspaceInviteResponseSchema",
    "syncContractsRemoveWorkspaceMemberRequestSchema",
    "syncContractsRemoveWorkspaceMemberResponseSchema",
    "syncContractsResendWorkspaceInviteRequestSchema",
    "syncContractsResendWorkspaceInviteResponseSchema",
    "syncContractsRevokeWorkspaceInviteRequestSchema",
    "syncContractsRevokeWorkspaceInviteResponseSchema",
    "syncContractsSyncConfirmationSchema",
    "syncContractsUpdateWorkspaceMemberRoleRequestSchema",
    "syncContractsUpdateWorkspaceMemberRoleResponseSchema",
    "syncContractsWorkspaceInviteSchema",
    "syncContractsWorkspaceMembersMutationGroup",
    "syncContractsWorkspaceRoleSchema",
  ])
})

test("package.json export map points to the built root entrypoint", async () => {
  const srcDir = dirname(fileURLToPath(import.meta.url))
  const packageJsonPath = join(srcDir, "..", "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    exports: Record<string, unknown>
    types: string
  }

  assert.equal(packageJson.types, "./dist/index.d.mts")
  assert.deepEqual(packageJson.exports["."], {
    import: "./dist/index.mjs",
    types: "./dist/index.d.mts",
  })
})

test("sync api exposes the workspace members mutation contract group", () => {
  assert.equal(typeof syncContractsApi.add, "function")
  assert.deepEqual(Object.keys(syncContractsApi.groups).toSorted(), [
    "workspace-members-mutations",
  ])
})
