import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = new URL("../../", import.meta.url)
const workflowPath = fileURLToPath(
  new URL(".github/workflows/ci.yml", repoRoot)
)

test("ci workflow runs the portless-backed e2e suite", () => {
  const workflow = readFileSync(workflowPath, "utf8")

  assert.match(workflow, /^ {2}e2e-tests:\n/mu)
  assert.match(workflow, /name: E2E Tests/u)
  assert.match(workflow, /npm install -g portless/u)
  assert.match(workflow, /pnpm playwright:install/u)
  assert.match(workflow, /pnpm test:e2e/u)
})
