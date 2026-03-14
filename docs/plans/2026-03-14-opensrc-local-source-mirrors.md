# OpenSrc Local Source Mirrors Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate local mirroring of selected dependency source code into `.opensrc/` and teach agents to consult it before Context7 or other remote package lookup tools.

**Architecture:** Keep the package list explicit in a tracked root manifest, run a small repo-owned Node sync engine that wraps the upstream `opensrc` CLI, and atomically promote the generated mirror from transient `opensrc/` to authoritative `.opensrc/`. Keep setup resilient by exposing a strict `pnpm opensrc:sync` command for maintainers and a soft-fail `pnpm setup` command for onboarding.

**Tech Stack:** pnpm workspace, Node.js 20+, ESM `.mjs` scripts, `opensrc` CLI, built-in `node:test`, Ultracite

---

## Chunk 1: Repo Wiring And Sync Engine

### Task 1: Add the curated manifest and root repo plumbing

**Files:**

- Create: `opensrc.packages.json`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Write the failing config checks**

```bash
test -f opensrc.packages.json &&
node -e "const fs=require('node:fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); if (pkg.devDependencies?.opensrc !== '0.6.0') process.exit(1)" &&
node -e "const fs=require('node:fs'); const ts=JSON.parse(fs.readFileSync('tsconfig.json','utf8')); const exclude=ts.exclude ?? []; for (const entry of ['.opensrc','.opensrc-backup','opensrc']) { if (!exclude.includes(entry)) process.exit(1) }" &&
node -e "const fs=require('node:fs'); const lines=new Set(fs.readFileSync('.gitignore','utf8').split(/\r?\n/)); for (const entry of ['.opensrc/','.opensrc-backup/','opensrc/']) { if (!lines.has(entry)) process.exit(1) }"
```

- [ ] **Step 2: Run the checks and confirm they fail**

Run: the command above from the repo root.
Expected: FAIL because the manifest file does not exist, `opensrc` is not a root dev dependency, root `tsconfig.json` has no excludes, and `.gitignore` does not ignore the local mirror directories.

- [ ] **Step 3: Add the minimal root configuration**

Create `opensrc.packages.json` with the initial curated package list:

```json
{
  "packages": [
    "react",
    "react-dom",
    "@tanstack/react-router",
    "@tanstack/react-start",
    "zod",
    "@base-ui/react"
  ]
}
```

Update `package.json` so root dev dependencies include a pinned `opensrc` version:

```json
{
  "devDependencies": {
    "@biomejs/biome": "^2.4.5",
    "opensrc": "0.6.0",
    "oxfmt": "^0.40.0",
    "oxlint": "^1.55.0",
    "turbo": "^2.8.8",
    "typescript": "5.9.3",
    "ultracite": "^7.3.0"
  }
}
```

Update `.gitignore` to ignore all local mirror surfaces the sync engine can create:

```gitignore
.opensrc/
.opensrc-backup/
opensrc/
```

Update `tsconfig.json` so the repo root never includes those directories in the TypeScript program:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": true
  },
  "exclude": [".opensrc", ".opensrc-backup", "opensrc"]
}
```

- [ ] **Step 4: Install the new dependency and refresh the lockfile**

Run: `pnpm install`
Expected: PASS and `pnpm-lock.yaml` now contains `opensrc@0.6.0` under the root importer.

- [ ] **Step 5: Re-run the config checks**

Run: the command from Step 1.
Expected: PASS.

- [ ] **Step 6: Commit the repo plumbing**

```bash
git add opensrc.packages.json .gitignore package.json tsconfig.json pnpm-lock.yaml
git commit -m "chore: add opensrc mirror configuration"
```

### Task 2: Build the sync engine, CLI wrapper, and tests

**Files:**

- Create: `scripts/lib/opensrc-sync.mjs`
- Create: `scripts/lib/opensrc-sync.test.mjs`
- Create: `scripts/sync-opensrc.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test file**

Create `scripts/lib/opensrc-sync.test.mjs` with focused `node:test` cases that cover manifest loading, index validation, runner arguments, strict vs soft-fail exit behavior, rollback, and missing CLI failures:

```js
import assert from "node:assert/strict"
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  createChildProcessRunner,
  loadConfiguredPackages,
  runOpensrc,
  validateSourcesIndex,
  syncOpensrc,
} from "./opensrc-sync.mjs"

test("loadConfiguredPackages returns the curated package list", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-manifest-"))
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react", "zod"] }, null, 2)
  )

  assert.deepEqual(await loadConfiguredPackages(rootDir), ["react", "zod"])

  await rm(rootDir, { recursive: true, force: true })
})

test("validateSourcesIndex rejects missing configured packages", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-index-"))
  await mkdir(path.join(rootDir, "opensrc"), { recursive: true })
  await writeFile(
    path.join(rootDir, "opensrc", "sources.json"),
    JSON.stringify(
      {
        packages: [
          {
            name: "react",
            path: "repos/github.com/facebook/react",
            registry: "npm",
            version: "19.2.4",
          },
        ],
      },
      null,
      2
    )
  )

  await assert.rejects(
    () => validateSourcesIndex(rootDir, ["react", "zod"]),
    /Missing mirrored packages: zod/
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("validateSourcesIndex requires name, version, registry, and path for mirrored packages", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-contract-"))
  await mkdir(path.join(rootDir, "opensrc"), { recursive: true })
  await writeFile(
    path.join(rootDir, "opensrc", "sources.json"),
    JSON.stringify(
      {
        packages: [{ name: "react", path: "repos/github.com/facebook/react" }],
      },
      null,
      2
    )
  )

  await assert.rejects(
    () => validateSourcesIndex(rootDir, ["react"]),
    /Invalid mirrored package entry/
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("runOpensrc forwards the curated packages, root cwd, and --modify=false", async () => {
  const calls = []
  await runOpensrc(
    "/repo/root",
    ["react", "zod"],
    async (command, args, options) => {
      calls.push({ command, args, options })
    }
  )

  assert.deepEqual(calls, [
    {
      command: "pnpm",
      args: [
        "exec",
        "opensrc",
        "react",
        "zod",
        "--modify=false",
        "--cwd",
        "/repo/root",
      ],
      options: { cwd: "/repo/root" },
    },
  ])
})

test("runOpensrc remains non-interactive for strict and onboarding flows", async () => {
  const calls = []
  const runner = async (command, args, options) => {
    calls.push({ command, args, options })
  }

  await runOpensrc("/repo/root", ["react"], runner)
  await runOpensrc("/repo/root", ["react"], runner)

  for (const call of calls) {
    assert.equal(call.command, "pnpm")
    assert.ok(call.args.includes("--modify=false"))
    assert.ok(
      !call.args.some((arg) => arg === "--modify" || arg === "--interactive")
    )
    assert.deepEqual(call.options, { cwd: "/repo/root" })
  }
})

test("createChildProcessRunner uses inherited stdio for non-interactive automation", async () => {
  let receivedOptions
  const fakeSpawn = (command, args, options) => {
    receivedOptions = options
    return {
      on(event, handler) {
        if (event === "exit") {
          handler(0)
        }

        return this
      },
    }
  }

  const runner = createChildProcessRunner(
    { info() {}, warn() {}, error() {} },
    fakeSpawn
  )
  await runner("pnpm", ["exec", "opensrc", "react"], { cwd: "/repo/root" })

  assert.equal(receivedOptions.stdio, "inherit")
  assert.equal(receivedOptions.cwd, "/repo/root")
})

test("syncOpensrc restores the previous mirror and exits 1 in strict mode when the fetch command fails", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-sync-"))
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react"] }, null, 2)
  )
  await mkdir(path.join(rootDir, ".opensrc"), { recursive: true })
  await writeFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "keep me")

  const exitCode = await syncOpensrc({
    rootDir,
    softFail: false,
    runCommand: async () => {
      throw new Error("simulated fetch failure")
    },
    logger: { info() {}, warn() {}, error() {} },
  })

  assert.equal(exitCode, 1)
  assert.equal(
    await readFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "utf8"),
    "keep me"
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc restores the previous mirror and exits 0 in soft-fail mode when validation fails", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-soft-fail-"))
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react", "zod"] }, null, 2)
  )
  await mkdir(path.join(rootDir, ".opensrc"), { recursive: true })
  await writeFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "keep me")
  const warnings = []

  const exitCode = await syncOpensrc({
    rootDir,
    softFail: true,
    runCommand: async () => {
      await mkdir(path.join(rootDir, "opensrc"), { recursive: true })
      await writeFile(
        path.join(rootDir, "opensrc", "sources.json"),
        JSON.stringify(
          {
            packages: [
              {
                name: "react",
                version: "19.2.4",
                registry: "npm",
                path: "repos/github.com/facebook/react",
              },
            ],
          },
          null,
          2
        )
      )
    },
    logger: {
      info() {},
      warn(message) {
        warnings.push(message)
      },
      error() {},
    },
  })

  assert.equal(exitCode, 0)
  assert.match(warnings.join("\n"), /opensrc sync skipped:/)
  assert.equal(
    await readFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "utf8"),
    "keep me"
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc restores the previous mirror and exits 1 in strict mode when validation fails", async () => {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), "opensrc-strict-validation-")
  )
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react", "zod"] }, null, 2)
  )
  await mkdir(path.join(rootDir, ".opensrc"), { recursive: true })
  await writeFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "keep me")

  const exitCode = await syncOpensrc({
    rootDir,
    softFail: false,
    runCommand: async () => {
      await mkdir(path.join(rootDir, "opensrc"), { recursive: true })
      await writeFile(
        path.join(rootDir, "opensrc", "sources.json"),
        JSON.stringify(
          {
            packages: [
              {
                name: "react",
                version: "19.2.4",
                registry: "npm",
                path: "repos/github.com/facebook/react",
              },
            ],
          },
          null,
          2
        )
      )
    },
    logger: { info() {}, warn() {}, error() {} },
  })

  assert.equal(exitCode, 1)
  assert.equal(
    await readFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "utf8"),
    "keep me"
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc restores the previous mirror and warns in soft-fail mode when the fetch command fails", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-soft-fetch-"))
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react"] }, null, 2)
  )
  await mkdir(path.join(rootDir, ".opensrc"), { recursive: true })
  await writeFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "keep me")
  const warnings = []

  const exitCode = await syncOpensrc({
    rootDir,
    softFail: true,
    runCommand: async () => {
      throw new Error("simulated fetch failure")
    },
    logger: {
      info() {},
      warn(message) {
        warnings.push(message)
      },
      error() {},
    },
  })

  assert.equal(exitCode, 0)
  assert.match(
    warnings.join("\n"),
    /opensrc sync skipped: simulated fetch failure/
  )
  assert.equal(
    await readFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "utf8"),
    "keep me"
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc restores the previous mirror and exits 1 in strict mode when promotion fails", async () => {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), "opensrc-promotion-fail-")
  )
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react"] }, null, 2)
  )
  await mkdir(path.join(rootDir, ".opensrc"), { recursive: true })
  await writeFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "keep me")

  const originalRename = rename
  let renameCalls = 0

  const exitCode = await syncOpensrc({
    rootDir,
    softFail: false,
    runCommand: async () => {
      await mkdir(path.join(rootDir, "opensrc"), { recursive: true })
      await writeFile(
        path.join(rootDir, "opensrc", "sources.json"),
        JSON.stringify(
          {
            packages: [
              {
                name: "react",
                version: "19.2.4",
                registry: "npm",
                path: "repos/github.com/facebook/react",
              },
            ],
          },
          null,
          2
        )
      )
    },
    renameImpl: async (...args) => {
      renameCalls += 1
      if (renameCalls === 2) {
        throw new Error("simulated promotion failure")
      }

      return originalRename(...args)
    },
    logger: { info() {}, warn() {}, error() {} },
  })

  assert.equal(exitCode, 1)
  assert.equal(
    await readFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "utf8"),
    "keep me"
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc restores the previous mirror and warns in soft-fail mode when promotion fails", async () => {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), "opensrc-promotion-soft-fail-")
  )
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react"] }, null, 2)
  )
  await mkdir(path.join(rootDir, ".opensrc"), { recursive: true })
  await writeFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "keep me")

  const originalRename = rename
  let renameCalls = 0
  const warnings = []

  const exitCode = await syncOpensrc({
    rootDir,
    softFail: true,
    runCommand: async () => {
      await mkdir(path.join(rootDir, "opensrc"), { recursive: true })
      await writeFile(
        path.join(rootDir, "opensrc", "sources.json"),
        JSON.stringify(
          {
            packages: [
              {
                name: "react",
                version: "19.2.4",
                registry: "npm",
                path: "repos/github.com/facebook/react",
              },
            ],
          },
          null,
          2
        )
      )
    },
    renameImpl: async (...args) => {
      renameCalls += 1
      if (renameCalls === 2) {
        throw new Error("simulated promotion failure")
      }

      return originalRename(...args)
    },
    logger: {
      info() {},
      warn(message) {
        warnings.push(message)
      },
      error() {},
    },
  })

  assert.equal(exitCode, 0)
  assert.match(
    warnings.join("\n"),
    /opensrc sync skipped: simulated promotion failure/
  )
  assert.equal(
    await readFile(path.join(rootDir, ".opensrc", "sentinel.txt"), "utf8"),
    "keep me"
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc surfaces a clear missing-CLI error message", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-cli-error-"))
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react"] }, null, 2)
  )

  const messages = []
  const exitCode = await syncOpensrc({
    rootDir,
    softFail: false,
    runCommand: async () => {
      throw new Error("pnpm could not find opensrc on PATH")
    },
    logger: {
      info() {},
      warn(message) {
        messages.push(message)
      },
      error(message) {
        messages.push(message)
      },
    },
  })

  assert.equal(exitCode, 1)
  assert.match(
    messages.join("\n"),
    /opensrc sync failed: pnpm could not find opensrc on PATH\. Run pnpm install and retry\./
  )

  await rm(rootDir, { recursive: true, force: true })
})

test("syncOpensrc warns and exits 0 in soft-fail mode when opensrc is unavailable", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "opensrc-cli-soft-"))
  await writeFile(
    path.join(rootDir, "opensrc.packages.json"),
    JSON.stringify({ packages: ["react"] }, null, 2)
  )

  const messages = []
  const exitCode = await syncOpensrc({
    rootDir,
    softFail: true,
    runCommand: async () => {
      throw new Error("pnpm could not find opensrc on PATH")
    },
    logger: {
      info() {},
      warn(message) {
        messages.push(message)
      },
      error(message) {
        messages.push(message)
      },
    },
  })

  assert.equal(exitCode, 0)
  assert.match(
    messages.join("\n"),
    /opensrc sync skipped: pnpm could not find opensrc on PATH\. Run pnpm install and retry\./
  )

  await rm(rootDir, { recursive: true, force: true })
})
```

- [ ] **Step 2: Run the new test file and confirm it fails**

Run: `node --test scripts/lib/opensrc-sync.test.mjs`
Expected: FAIL with a module-not-found error because `scripts/lib/opensrc-sync.mjs` does not exist yet.

- [ ] **Step 3: Implement the reusable sync engine**

Create `scripts/lib/opensrc-sync.mjs` as the single-responsibility module that owns manifest loading, transient-directory validation, atomic promotion, and exit-code policy.

Use this structure:

```js
import { access, readFile, rename, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const TRANSIENT_DIR = "opensrc"
const TARGET_DIR = ".opensrc"
const BACKUP_DIR = ".opensrc-backup"
const INDEX_FILE = "sources.json"

export async function loadConfiguredPackages(rootDir) {
  const manifestPath = path.join(rootDir, "opensrc.packages.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  const packages = manifest.packages

  if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error(
      "opensrc.packages.json must contain a non-empty packages array"
    )
  }

  const invalid = packages.find(
    (entry) => typeof entry !== "string" || entry.length === 0
  )
  if (invalid) {
    throw new Error(
      "opensrc.packages.json packages entries must be non-empty strings"
    )
  }

  return [...new Set(packages)]
}

export async function validateSourcesIndex(rootDir, configuredPackages) {
  const indexPath = path.join(rootDir, TRANSIENT_DIR, INDEX_FILE)
  const raw = JSON.parse(await readFile(indexPath, "utf8"))
  const packages = raw.packages ?? []
  const names = new Set(packages.map((entry) => entry.name))
  const missing = configuredPackages.filter((name) => !names.has(name))

  if (missing.length > 0) {
    throw new Error(`Missing mirrored packages: ${missing.join(", ")}`)
  }

  for (const entry of packages) {
    if (
      typeof entry.name !== "string" ||
      typeof entry.version !== "string" ||
      typeof entry.registry !== "string" ||
      typeof entry.path !== "string" ||
      entry.name.length === 0 ||
      entry.version.length === 0 ||
      entry.registry.length === 0 ||
      entry.path.length === 0
    ) {
      throw new Error(
        `Invalid mirrored package entry: ${JSON.stringify(entry)}`
      )
    }
  }

  return raw
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function runOpensrc(rootDir, packages, runCommand) {
  await runCommand(
    "pnpm",
    ["exec", "opensrc", ...packages, "--modify=false", "--cwd", rootDir],
    { cwd: rootDir }
  )
}

export function createChildProcessRunner(logger, spawnImpl = spawn) {
  return async (command, args, options) => {
    await new Promise((resolve, reject) => {
      const child = spawnImpl(command, args, {
        ...options,
        stdio: "inherit",
      })

      child.on("exit", (code) => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`${command} exited with code ${code ?? "unknown"}`))
      })

      child.on("error", reject)
    })
  }
}

export async function syncOpensrc({
  rootDir,
  softFail = false,
  runCommand,
  logger = console,
  renameImpl = rename,
}) {
  const configuredPackages = await loadConfiguredPackages(rootDir)
  const transientDir = path.join(rootDir, TRANSIENT_DIR)
  const targetDir = path.join(rootDir, TARGET_DIR)
  const backupDir = path.join(rootDir, BACKUP_DIR)
  const runner = runCommand ?? createChildProcessRunner(logger)

  await rm(transientDir, { recursive: true, force: true })
  await rm(backupDir, { recursive: true, force: true })

  const hadTarget = await pathExists(targetDir)
  if (hadTarget) {
    await renameImpl(targetDir, backupDir)
  }

  try {
    await runOpensrc(rootDir, configuredPackages, runner)
    await validateSourcesIndex(rootDir, configuredPackages)
    await renameImpl(transientDir, targetDir)
    await rm(backupDir, { recursive: true, force: true })
    logger.info(
      `Mirrored ${configuredPackages.length} packages into ${TARGET_DIR}/`
    )
    return 0
  } catch (error) {
    await rm(transientDir, { recursive: true, force: true })

    if (hadTarget) {
      await renameImpl(backupDir, targetDir)
    }

    if (!hadTarget) {
      await rm(backupDir, { recursive: true, force: true })
    }

    const message = error instanceof Error ? error.message : String(error)
    const remediation = /could not find opensrc on PATH/i.test(message)
      ? `${message}. Run pnpm install and retry.`
      : message
    if (softFail) {
      logger.warn(`opensrc sync skipped: ${remediation}`)
      return 0
    }

    logger.error(`opensrc sync failed: ${remediation}`)
    return 1
  }
}

export function getRepoRootFromHere(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..", "..")
}
```

- [ ] **Step 4: Add the CLI wrapper and root scripts**

Create `scripts/sync-opensrc.mjs` as a thin entrypoint:

```js
import process from "node:process"

import { getRepoRootFromHere, syncOpensrc } from "./lib/opensrc-sync.mjs"

const softFail = process.argv.includes("--soft-fail")
const rootDir = getRepoRootFromHere(import.meta.url)
const exitCode = await syncOpensrc({ rootDir, softFail })

process.exit(exitCode)
```

Update root `package.json` scripts:

```json
{
  "scripts": {
    "build": "turbo build",
    "check": "pnpm exec ultracite check",
    "dev": "turbo dev",
    "fix": "pnpm exec ultracite fix && pnpm exec oxfmt --write .",
    "format": "pnpm fix",
    "lint": "pnpm check",
    "opensrc:sync": "node scripts/sync-opensrc.mjs",
    "setup": "pnpm install && node scripts/sync-opensrc.mjs --soft-fail",
    "test:opensrc": "node --test scripts/lib/opensrc-sync.test.mjs",
    "typecheck": "turbo typecheck"
  }
}
```

- [ ] **Step 5: Run the sync-engine tests**

Run: `pnpm test:opensrc`
Expected: PASS, including proof that the wrapper forwards the curated manifest, repo-root cwd, and `--modify=false`, stays non-interactive, preserves the prior mirror on fetch, validation, and promotion failures, and handles strict and onboarding modes with the correct exit codes.

- [ ] **Step 6: Commit the sync engine**

```bash
git add scripts/lib/opensrc-sync.mjs scripts/lib/opensrc-sync.test.mjs scripts/sync-opensrc.mjs package.json
git commit -m "feat: add opensrc sync workflow"
```

## Chunk 2: Agent Guidance And End-To-End Verification

### Task 3: Document the workflow for humans and agents

**Files:**

- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: Write the failing documentation checks**

```bash
node -e "const fs=require('node:fs'); const agents=fs.readFileSync('AGENTS.md','utf8'); const checks=['.opensrc/sources.json','authoritative index','`path` field','Context7','Only use remote package lookup']; for (const entry of checks) { if (!agents.includes(entry)) process.exit(1) }" &&
node -e "const fs=require('node:fs'); const readme=fs.readFileSync('README.md','utf8'); const checks=['pnpm setup','pnpm opensrc:sync','.opensrc/','.opensrc/sources.json']; for (const entry of checks) { if (!readme.includes(entry)) process.exit(1) }"
```

- [ ] **Step 2: Run the checks and confirm they fail**

Run: the command above.
Expected: FAIL because neither file currently documents the local mirror workflow or the Context7-first guidance.

- [ ] **Step 3: Add the minimal docs and agent guidance**

Append a small section to `AGENTS.md` near the AI guidance content:

```md
## Local Dependency Source Mirrors

- Local dependency source mirrors live in `.opensrc/`.
- Check `.opensrc/sources.json` first; it is the authoritative index of what is mirrored locally.
- Use the `path` field from `.opensrc/sources.json` to open local dependency source; do not guess folder names for scoped packages.
- When you need dependency internals, read the local mirror before using Context7 or other remote package lookup tools.
- Only use remote package lookup when the package is missing from `.opensrc/` or the local source still does not answer the question.
```

Add a short section to `README.md` that documents the onboarding and maintenance commands:

````md
## Local dependency source mirrors

Run the onboarding command from a fresh clone:

```bash
pnpm setup
```
````

That command installs dependencies and then mirrors the curated package list into `.opensrc/` in soft-fail mode.

To refresh the local mirror in strict mode:

```bash
pnpm opensrc:sync
```

Use `.opensrc/sources.json` as the index of what is available locally.

````

- [ ] **Step 4: Re-run the documentation checks**

Run: the command from Step 1.
Expected: PASS.

- [ ] **Step 5: Commit the documentation updates**

```bash
git add AGENTS.md README.md
git commit -m "docs: add opensrc mirror guidance"
````

### Task 4: Run the end-to-end verification suite

**Files:**

- Verify only: `.opensrc/` local output

- [ ] **Step 1: Reset to a clean verification starting point**

Run:

```bash
rm -rf .opensrc .opensrc-backup opensrc && test ! -e .opensrc && test ! -e opensrc
```

Expected: PASS, proving the end-to-end checks start from a known empty mirror state.

- [ ] **Step 2: Run the strict sync command**

Run: `pnpm opensrc:sync`
Expected: PASS and `.opensrc/sources.json` is created after the transient `opensrc/` directory is promoted.

- [ ] **Step 3: Verify every curated package is indexed locally**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; const manifest = JSON.parse(fs.readFileSync('opensrc.packages.json', 'utf8')); const index = JSON.parse(fs.readFileSync('.opensrc/sources.json', 'utf8')); const names = new Set((index.packages ?? []).map((entry) => entry.name)); const missing = manifest.packages.filter((name) => !names.has(name)); if (missing.length) { console.error(`Missing: ${missing.join(', ')}`); process.exit(1) }"
```

Expected: PASS.

- [ ] **Step 4: Verify the onboarding command populates the mirror**

Run:

```bash
pnpm test:opensrc &&
rm -rf .opensrc .opensrc-backup opensrc &&
pnpm setup &&
test -f .opensrc/sources.json
```

Expected: PASS. This proves the onboarding `pnpm setup` path repopulates `.opensrc/` in soft-fail mode.

- [ ] **Step 5: Run the repo-wide verification commands**

Run:

```bash
pnpm exec ultracite fix &&
pnpm check &&
pnpm typecheck
```

Expected: PASS. If an unrelated pre-existing repo issue fails one of the final checks, capture the exact failure in the implementation notes before proceeding.

- [ ] **Step 6: Verify git cleanliness after the workflow**

```bash
git status --short
```

Expected: only the tracked files from Tasks 1-3 are staged or already committed, and `.opensrc/` stays untracked because `.gitignore` covers it.

- [ ] **Step 7: Commit any tracked verification fixes only if they were needed**

If verification required a final tracked fix, stage only the specific tracked files you changed and commit them. Do not use `git add .`.

```bash
git add <exact-tracked-files>
git commit -m "chore: verify opensrc local mirror workflow"
```
