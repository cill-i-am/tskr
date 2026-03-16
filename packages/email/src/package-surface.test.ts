import assert from "node:assert/strict"
import test from "node:test"

import * as emailPackage from "./index.ts"

test("root export surface does not expose provider-specific errors", () => {
  assert.equal("EmailTransportError" in emailPackage, false)
})
