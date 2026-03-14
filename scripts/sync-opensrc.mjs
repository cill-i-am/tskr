import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { syncOpensrcMirror } from "./lib/opensrc-sync.mjs"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, "..")
const softFail = process.argv.includes("--soft-fail")

const result = await syncOpensrcMirror({
  repoRoot,
  softFail,
})

process.exitCode = result.exitCode
