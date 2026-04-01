import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = new URL("../../", import.meta.url)

const readPackageJson = (relativePath) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(relativePath, repoRoot)), "utf8")
  )

const readTurboJson = () =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL("turbo.json", repoRoot)), "utf8")
  )

const readE2eRunner = () =>
  readFileSync(
    fileURLToPath(new URL("scripts/e2e/run-playwright.mjs", repoRoot)),
    "utf8"
  )

test("root e2e scripts delegate directly to the shared runner", () => {
  const rootPackage = readPackageJson("package.json")

  assert.match(
    rootPackage.scripts["test:e2e"],
    /^node scripts\/e2e\/run-playwright\.mjs$/u
  )
  assert.match(
    rootPackage.scripts["test:e2e:headed"],
    /^node scripts\/e2e\/run-playwright\.mjs --headed$/u
  )
  assert.match(
    rootPackage.scripts["test:e2e:debug"],
    /^node scripts\/e2e\/run-playwright\.mjs --debug$/u
  )
})

test("root integration script bootstraps local postgres before migration", () => {
  const rootPackage = readPackageJson("package.json")
  const integrationScript = rootPackage.scripts["test:integration"]
  const launcherMarker =
    " && node scripts/local-postgres-launcher.mjs -- sh -lc '"
  const [beforeLauncher, launcherCommand] =
    integrationScript.split(launcherMarker)

  assert.ok(
    typeof launcherCommand === "string",
    "Expected root integration script to delegate through local-postgres-launcher."
  )
  assert.doesNotMatch(
    beforeLauncher,
    /pnpm --filter @workspace\/db db:migrate/u
  )
  assert.match(
    launcherCommand,
    /^pnpm --filter @workspace\/db db:migrate && pnpm --dir apps\/auth exec vitest run/u
  )
})

test("e2e dev scripts pin distinct app ports for web and auth", () => {
  const webPackage = readPackageJson("apps/web/package.json")
  const authPackage = readPackageJson("apps/auth/package.json")

  assert.match(webPackage.scripts["e2e:dev"], /--app-port 4791/u)
  assert.match(authPackage.scripts["e2e:dev"], /--app-port 4792/u)
})

test("app typecheck scripts stay focused on local typechecking", () => {
  const authPackage = readPackageJson("apps/auth/package.json")
  const webPackage = readPackageJson("apps/web/package.json")

  assert.equal(
    authPackage.scripts.typecheck,
    "tsc --project tsconfig.json --noEmit"
  )
  assert.equal(webPackage.scripts.typecheck, "tsc --noEmit")
})

test("turbo e2e dev tasks wait for dependent package builds", () => {
  const turboJson = readTurboJson()

  assert.deepEqual(turboJson.tasks["e2e:dev"]?.dependsOn, ["^build"])
  assert.equal(turboJson.tasks["e2e:dev"]?.cache, false)
  assert.equal(turboJson.tasks["e2e:dev"]?.persistent, true)
})

test("turbo forwards the e2e email capture directory into app tasks", () => {
  const turboJson = readTurboJson()

  assert.ok(turboJson.globalPassThroughEnv.includes("E2E_EMAIL_CAPTURE_DIR"))
})

test("turbo forwards the e2e tls override into app tasks", () => {
  const turboJson = readTurboJson()

  assert.ok(
    turboJson.globalPassThroughEnv.includes("NODE_TLS_REJECT_UNAUTHORIZED")
  )
})

test("the e2e runner migrates the local postgres database before booting apps", () => {
  const runner = readE2eRunner()

  assert.match(runner, /const migrateLocalPostgres = async \(env\) =>/u)
  assert.match(runner, /@workspace\/db", "db:migrate"/u)
  assert.match(
    runner,
    /await migrateLocalPostgres\(sharedEnv\)\s+\n\s+const devProcess = spawnManagedProcess/u
  )
})

test("turbo typecheck waits for dependency builds before downstream apps", () => {
  const turboJson = readTurboJson()

  assert.deepEqual(turboJson.tasks.typecheck?.dependsOn, [
    "^build",
    "^typecheck",
  ])
})
