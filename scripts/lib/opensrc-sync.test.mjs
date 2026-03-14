import assert from "node:assert/strict"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"

import {
  loadOpensrcManifest,
  syncOpensrcMirror,
  validateSourcesIndex,
} from "./opensrc-sync.mjs"

test("loads the manifest", async (t) => {
  const repoRoot = await createRepo(t, {
    manifestPackages: ["react", "zod", "@base-ui/react"],
  })

  const packages = await loadOpensrcManifest(repoRoot)

  assert.deepEqual(packages, ["react", "zod", "@base-ui/react"])
})

test("rejects non-string manifest entries", async (t) => {
  const repoRoot = await createRepo(t, {
    manifestPackages: [42],
  })

  await assert.rejects(
    () => loadOpensrcManifest(repoRoot),
    /opensrc\.packages\.json packages\[0\] must be a non-empty string/
  )
})

test("rejects empty-string manifest entries", async (t) => {
  const repoRoot = await createRepo(t, {
    manifestPackages: [""],
  })

  await assert.rejects(
    () => loadOpensrcManifest(repoRoot),
    /opensrc\.packages\.json packages\[0\] must be a non-empty string/
  )
})

test("validates sources index required fields", async (t) => {
  for (const [field, entry] of [
    ["name", { path: "opensrc/react", registry: "npm", version: "19.0.0" }],
    ["version", { name: "react", path: "opensrc/react", registry: "npm" }],
    ["registry", { name: "react", path: "opensrc/react", version: "19.0.0" }],
    ["path", { name: "react", registry: "npm", version: "19.0.0" }],
  ]) {
    const repoRoot = await createRepo(t)

    await writeJson(join(repoRoot, "opensrc", "sources.json"), {
      packages: [entry],
    })

    await assert.rejects(
      () => validateSourcesIndex(repoRoot),
      new RegExp(field)
    )
  }
})

test("validates sources index includes every configured package", async (t) => {
  const repoRoot = await createRepo(t, {
    manifestPackages: ["react", "zod"],
  })

  await writeJson(join(repoRoot, "opensrc", "sources.json"), {
    packages: [
      {
        name: "react",
        path: "opensrc/react",
        registry: "npm",
        version: "19.0.0",
      },
    ],
  })

  await assert.rejects(() => validateSourcesIndex(repoRoot), /zod/)
})

test("forwards curated packages, repo root cwd, and modify false", async (t) => {
  const repoRoot = await createRepo(t, {
    manifestPackages: ["react", "zod"],
  })
  const invocations = []

  const result = await syncOpensrcMirror({
    repoRoot,
    runner: createSuccessRunner(repoRoot, invocations),
  })

  assert.equal(result.exitCode, 0)
  assert.equal(invocations.length, 1)
  assert.deepEqual(invocations[0], {
    args: [
      "exec",
      "opensrc",
      "react",
      "zod",
      "--modify=false",
      "--cwd",
      repoRoot,
    ],
    command: "pnpm",
    options: {
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: "1",
        npm_config_yes: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  })
})

test("runs in non-interactive mode", async (t) => {
  const repoRoot = await createRepo(t)
  const invocations = []

  await syncOpensrcMirror({
    repoRoot,
    runner: createSuccessRunner(repoRoot, invocations),
  })

  assert.equal(invocations[0].options.stdio[0], "ignore")
  assert.equal(invocations[0].options.env.CI, "1")
  assert.equal(invocations[0].options.env.npm_config_yes, "true")
})

test("strict fetch failure rolls back and exits 1", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: async () => {
      await mkdir(join(repoRoot, "opensrc"), { recursive: true })
      await writeFile(join(repoRoot, "opensrc", "partial.txt"), "partial")

      return { code: 2, stderr: "fetch failed", stdout: "" }
    },
  })

  assert.equal(result.exitCode, 1)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.equal(await pathExists(join(repoRoot, ".opensrc-backup")), false)
  assert.equal(await pathExists(join(repoRoot, "opensrc")), false)
})

test("strict validation failure rolls back and exits 1", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: async () => {
      await writeJson(join(repoRoot, "opensrc", "sources.json"), {
        packages: [{ name: "react" }],
      })

      return { code: 0, stderr: "", stdout: "" }
    },
  })

  assert.equal(result.exitCode, 1)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.equal(await pathExists(join(repoRoot, ".opensrc-backup")), false)
  assert.equal(await pathExists(join(repoRoot, "opensrc")), false)
})

test("strict promotion failure rolls back and exits 1", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()
  const fs = createFsWithPromotionFailure(repoRoot)

  const result = await syncOpensrcMirror({
    console: logger.console,
    fs,
    repoRoot,
    runner: createSuccessRunner(repoRoot),
  })

  assert.equal(result.exitCode, 1)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.equal(await pathExists(join(repoRoot, ".opensrc-backup")), false)
})

test("successful sync replaces existing mirror and removes backup", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })

  const result = await syncOpensrcMirror({
    repoRoot,
    runner: createSuccessRunner(repoRoot),
  })

  assert.equal(result.exitCode, 0)
  assert.equal(await readMirrorMarker(repoRoot), "fresh mirror")
  assert.equal(await pathExists(join(repoRoot, ".opensrc-backup")), false)
  assert.equal(await pathExists(join(repoRoot, "opensrc")), false)
})

test("soft-fail validation failure rolls back with warning and exits 0", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: async () => {
      await writeJson(join(repoRoot, "opensrc", "sources.json"), {
        packages: [{ name: "react" }],
      })

      return { code: 0, stderr: "", stdout: "" }
    },
    softFail: true,
  })

  assert.equal(result.exitCode, 0)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.warn.join("\n"), /validation failed/i)
})

test("soft-fail fetch failure rolls back with warning and exits 0", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: () => ({ code: 2, stderr: "fetch failed", stdout: "" }),
    softFail: true,
  })

  assert.equal(result.exitCode, 0)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.warn.join("\n"), /fetch failed/i)
})

test("soft-fail promotion failure rolls back with warning and exits 0", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()
  const fs = createFsWithPromotionFailure(repoRoot)

  const result = await syncOpensrcMirror({
    console: logger.console,
    fs,
    repoRoot,
    runner: createSuccessRunner(repoRoot),
    softFail: true,
  })

  assert.equal(result.exitCode, 0)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.warn.join("\n"), /promotion failed/i)
})

test("strict missing CLI reports remediation and exits 1", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: () => {
      const error = new Error("spawn pnpm ENOENT")
      error.code = "ENOENT"
      throw error
    },
  })

  assert.equal(result.exitCode, 1)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.error.join("\n"), /pnpm install/i)
  assert.match(logger.messages.error.join("\n"), /opensrc:sync/i)
})

test("strict missing CLI from pnpm stderr reports remediation and exits 1", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: () => ({
      code: 1,
      stderr: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "opensrc" not found',
      stdout: "",
    }),
  })

  assert.equal(result.exitCode, 1)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.error.join("\n"), /pnpm install/i)
  assert.match(logger.messages.error.join("\n"), /opensrc:sync/i)
})

test("soft-fail missing CLI reports remediation warning and exits 0", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: () => {
      const error = new Error("spawn pnpm ENOENT")
      error.code = "ENOENT"
      throw error
    },
    softFail: true,
  })

  assert.equal(result.exitCode, 0)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.warn.join("\n"), /pnpm install/i)
  assert.match(logger.messages.warn.join("\n"), /opensrc:sync/i)
})

test("soft-fail missing CLI from pnpm stderr reports remediation warning and exits 0", async (t) => {
  const repoRoot = await createRepo(t, { existingMirror: true })
  const logger = createLogger()

  const result = await syncOpensrcMirror({
    console: logger.console,
    repoRoot,
    runner: () => ({
      code: 1,
      stderr: 'ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "opensrc" not found',
      stdout: "",
    }),
    softFail: true,
  })

  assert.equal(result.exitCode, 0)
  assert.equal(await readMirrorMarker(repoRoot), "previous mirror")
  assert.match(logger.messages.warn.join("\n"), /pnpm install/i)
  assert.match(logger.messages.warn.join("\n"), /opensrc:sync/i)
})

const createLogger = () => {
  const messages = {
    error: [],
    log: [],
    warn: [],
  }

  return {
    console: {
      error: (...args) => messages.error.push(args.join(" ")),
      log: (...args) => messages.log.push(args.join(" ")),
      warn: (...args) => messages.warn.push(args.join(" ")),
    },
    messages,
  }
}

const createSuccessRunner =
  (repoRoot, invocations = []) =>
  async (command, args, options) => {
    invocations.push({ args, command, options })
    await writeValidSources(repoRoot)

    return { code: 0, stderr: "", stdout: "" }
  }

const createFsWithPromotionFailure = (repoRoot) => {
  const transientDir = join(repoRoot, "opensrc")
  const mirrorDir = join(repoRoot, ".opensrc")

  return {
    access,
    mkdir,
    readFile,
    rename: (from, to) => {
      if (from === transientDir && to === mirrorDir) {
        throw new Error("promotion failed")
      }

      return rename(from, to)
    },
    rm,
  }
}

const createRepo = async (
  t,
  { manifestPackages = ["react"], existingMirror = false } = {}
) => {
  const repoRoot = await mkdtemp(join(tmpdir(), "opensrc-sync-"))

  t.after(async () => {
    await rm(repoRoot, { force: true, recursive: true })
  })

  await writeJson(join(repoRoot, "opensrc.packages.json"), {
    packages: manifestPackages,
  })

  if (existingMirror) {
    await mkdir(join(repoRoot, ".opensrc"), { recursive: true })
    await writeFile(join(repoRoot, ".opensrc", "marker.txt"), "previous mirror")
  }

  return repoRoot
}

const pathExists = async (filePath) => {
  try {
    await access(filePath)

    return true
  } catch {
    return false
  }
}

const readMirrorMarker = (repoRoot) =>
  readFile(join(repoRoot, ".opensrc", "marker.txt"), "utf8")

const writeJson = async (filePath, value) => {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const writeValidSources = async (repoRoot) => {
  const manifestPackages = await loadOpensrcManifest(repoRoot)

  await writeJson(join(repoRoot, "opensrc", "sources.json"), {
    packages: manifestPackages.map((name) => ({
      name,
      path: `opensrc/${name}`,
      registry: "npm",
      version: "19.0.0",
    })),
  })
  await writeFile(join(repoRoot, "opensrc", "marker.txt"), "fresh mirror")
}
