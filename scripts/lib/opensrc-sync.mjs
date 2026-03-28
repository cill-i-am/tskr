import { readFile } from "node:fs/promises"
import * as fs from "node:fs/promises"
import { join } from "node:path"

import { runCommand } from "./run-command.mjs"

const MANIFEST_FILE = "opensrc.packages.json"
const TRANSIENT_DIR = "opensrc"
const MIRROR_DIR = ".opensrc"
const BACKUP_DIR = ".opensrc-backup"

export const loadOpensrcManifest = async (repoRoot) => {
  const manifestPath = join(repoRoot, MANIFEST_FILE)
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))

  if (!Array.isArray(manifest.packages)) {
    throw new TypeError(`${MANIFEST_FILE} must contain a packages array`)
  }

  for (const [index, pkg] of manifest.packages.entries()) {
    if (typeof pkg !== "string" || pkg.trim().length === 0) {
      throw new TypeError(
        `${MANIFEST_FILE} packages[${index}] must be a non-empty string`
      )
    }
  }

  return manifest.packages
}

export const validateSourcesIndex = async (repoRoot, dependencies = {}) => {
  const fileReader = dependencies.readFile ?? readFile
  const sourcesPath = join(repoRoot, TRANSIENT_DIR, "sources.json")
  const configuredPackages = await loadOpensrcManifest(repoRoot)
  const sources = JSON.parse(await fileReader(sourcesPath, "utf8"))

  if (!Array.isArray(sources.packages)) {
    throw new TypeError("opensrc/sources.json must contain a packages array")
  }

  for (const [index, pkg] of sources.packages.entries()) {
    for (const field of ["name", "version", "registry", "path"]) {
      if (typeof pkg?.[field] !== "string" || pkg[field].length === 0) {
        throw new Error(
          `opensrc/sources.json package ${index} is missing required field ${field}`
        )
      }
    }
  }

  const fetchedPackages = new Set(sources.packages.map((pkg) => pkg.name))
  const missingPackages = configuredPackages.filter(
    (pkg) => !fetchedPackages.has(pkg)
  )

  if (missingPackages.length > 0) {
    throw new Error(
      `opensrc/sources.json is missing configured packages: ${missingPackages.join(", ")}`
    )
  }

  return sources
}

export const syncOpensrcMirror = async (options) => {
  const {
    repoRoot,
    softFail = false,
    fs: fileSystem = fs,
    runner = runCommand,
    console: logger = console,
  } = options
  const transientPath = join(repoRoot, TRANSIENT_DIR)
  const mirrorPath = join(repoRoot, MIRROR_DIR)
  const backupPath = join(repoRoot, BACKUP_DIR)

  await cleanupPath(fileSystem, transientPath)
  await cleanupPath(fileSystem, backupPath)

  try {
    const packages = await loadOpensrcManifest(repoRoot)
    const args = [
      "exec",
      "opensrc",
      ...packages,
      "--modify=false",
      "--cwd",
      repoRoot,
    ]
    const result = await runner("pnpm", args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: "1",
        npm_config_yes: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    })

    if (result.code !== 0) {
      if (isMissingCliResult(result)) {
        throw new Error(
          result.stderr || result.stdout || "opensrc command not found"
        )
      }

      throw new SyncError(
        `opensrc fetch failed${formatCommandOutput(result.stderr || result.stdout)}`,
        "fetch"
      )
    }

    try {
      await validateSourcesIndex(repoRoot)
    } catch (error) {
      throw new SyncError(
        `opensrc validation failed: ${error.message}`,
        "validation"
      )
    }

    try {
      await promoteMirror(fileSystem, { backupPath, mirrorPath, transientPath })
    } catch (error) {
      throw new SyncError(
        `opensrc promotion failed: ${error.message}`,
        "promotion"
      )
    }

    return { exitCode: 0 }
  } catch (error) {
    const missingCli = isMissingCliError(error)

    await rollbackMirror(fileSystem, { backupPath, mirrorPath, transientPath })

    const message = missingCli
      ? [
          "opensrc is unavailable. Run `pnpm install` to restore local tooling, then rerun `pnpm opensrc:sync`.",
          error.message,
        ].join("\n")
      : error.message

    if (softFail) {
      logger.warn(message)

      return { exitCode: 0 }
    }

    logger.error(message)

    return { exitCode: 1 }
  }
}

const cleanupPath = async (fileSystem, targetPath) => {
  await fileSystem.rm(targetPath, { force: true, recursive: true })
}

const promoteMirror = async (fileSystem, paths) => {
  const { transientPath, mirrorPath, backupPath } = paths

  await cleanupPath(fileSystem, backupPath)

  if (await pathExists(fileSystem, mirrorPath)) {
    await fileSystem.rename(mirrorPath, backupPath)
  }

  try {
    await fileSystem.rename(transientPath, mirrorPath)
    await cleanupPath(fileSystem, backupPath)
  } catch (error) {
    if (await pathExists(fileSystem, mirrorPath)) {
      await cleanupPath(fileSystem, mirrorPath)
    }

    if (await pathExists(fileSystem, backupPath)) {
      await fileSystem.rename(backupPath, mirrorPath)
    }

    throw error
  }
}

const rollbackMirror = async (fileSystem, paths) => {
  const { transientPath, mirrorPath, backupPath } = paths

  await cleanupPath(fileSystem, transientPath)

  if (await pathExists(fileSystem, backupPath)) {
    await cleanupPath(fileSystem, mirrorPath)
    await fileSystem.rename(backupPath, mirrorPath)
  }
}

const pathExists = async (fileSystem, targetPath) => {
  try {
    await fileSystem.access(targetPath)

    return true
  } catch {
    return false
  }
}

const isMissingCliError = (error) => {
  if (error?.code === "ENOENT") {
    return true
  }

  return isMissingCliText(error?.message)
}

const isMissingCliResult = (result) => {
  const output = `${result?.stderr ?? ""}\n${result?.stdout ?? ""}`

  return isMissingCliText(output)
}

const isMissingCliText = (value) => {
  if (!value) {
    return false
  }

  return (
    /ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL/i.test(value) &&
    /Command\s+"opensrc"\s+not\s+found/i.test(value)
  )
}

const formatCommandOutput = (output) => {
  if (!output) {
    return ""
  }

  return `: ${output.trim()}`
}

class SyncError extends Error {
  constructor(message, phase) {
    super(message)
    this.name = "SyncError"
    this.phase = phase
  }
}
