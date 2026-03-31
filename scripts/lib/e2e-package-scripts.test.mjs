import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = new URL("../../", import.meta.url)

const readPackageJson = (relativePath) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(relativePath, repoRoot)), "utf8")
  )

test("e2e dev scripts pin distinct app ports for web and auth", () => {
  const webPackage = readPackageJson("apps/web/package.json")
  const authPackage = readPackageJson("apps/auth/package.json")

  assert.match(webPackage.scripts["e2e:dev"], /--app-port 4791/u)
  assert.match(authPackage.scripts["e2e:dev"], /--app-port 4792/u)
})
