import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const readJson = async (relativePath) => {
  const fileUrl = new URL(relativePath, import.meta.url)
  const fileContent = await readFile(fileUrl, "utf8")

  return JSON.parse(fileContent)
}

const approvedRuntimeDependencies = ["hono", "@hono/node-server"]
const disallowedDevTestDependencies = ["vitest", "tsx", "@types/node"]

test("curated opensrc manifest covers approved api/auth runtime deps", async () => {
  const manifest = await readJson("../../opensrc.packages.json")
  const apiPackage = await readJson("../../apps/api/package.json")
  const authPackage = await readJson("../../apps/auth/package.json")
  const curatedPackages = new Set(manifest.packages)

  for (const [appName, pkg] of [
    ["apps/api/package.json", apiPackage],
    ["apps/auth/package.json", authPackage],
  ]) {
    for (const dependency of approvedRuntimeDependencies) {
      assert.equal(
        Object.hasOwn(pkg.dependencies ?? {}, dependency),
        true,
        `${appName} must keep approved runtime dependency "${dependency}" under dependencies`
      )
    }
  }

  for (const dependency of approvedRuntimeDependencies) {
    assert.equal(
      curatedPackages.has(dependency),
      true,
      `opensrc.packages.json must include approved runtime dependency "${dependency}"`
    )
  }

  for (const dependency of disallowedDevTestDependencies) {
    assert.equal(
      curatedPackages.has(dependency),
      false,
      `opensrc.packages.json must not include dev/test dependency "${dependency}"`
    )
  }
})
