import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const readJson = async (relativePath) => {
  const fileUrl = new URL(relativePath, import.meta.url)
  const fileContent = await readFile(fileUrl, "utf8")

  return JSON.parse(fileContent)
}

const pickRuntimeDependencies = (pkg, approvedDependencies) => {
  const dependencies = pkg.dependencies ?? {}

  return approvedDependencies.filter((name) =>
    Object.hasOwn(dependencies, name)
  )
}

test("curated opensrc manifest covers approved api/auth runtime deps", async () => {
  const manifest = await readJson("../../opensrc.packages.json")
  const apiPackage = await readJson("../../apps/api/package.json")
  const authPackage = await readJson("../../apps/auth/package.json")

  const approvedRuntimeDeps = ["hono", "@hono/node-server"]
  const expectedCoverage = new Set([
    ...pickRuntimeDependencies(apiPackage, approvedRuntimeDeps),
    ...pickRuntimeDependencies(authPackage, approvedRuntimeDeps),
  ])

  const curatedPackages = new Set(manifest.packages)

  for (const dependency of expectedCoverage) {
    assert.equal(
      curatedPackages.has(dependency),
      true,
      `opensrc.packages.json must include approved runtime dependency "${dependency}"`
    )
  }
})
