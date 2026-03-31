import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { Effect } from "effect"

import {
  buildHostedSandboxUrls,
  buildLocalSandboxUrls,
  buildSandboxEnvFiles,
  deriveSandboxIdentity,
  deriveSandboxPorts,
} from "./config.js"

interface CreateSandboxStateOptions {
  emailFrom: string
  hostedDomainRoot: string
  name: string
  repositoryRoot: string
}

interface LoadSandboxStateOptions {
  name: string
  repositoryRoot: string
}

interface ListSandboxStatesOptions {
  repositoryRoot: string
}

interface SandboxStatePaths {
  hosted: string
  local: string
  root: string
}

interface SandboxState {
  createdAt: string
  hostedDomainRoot: string
  identity: ReturnType<typeof deriveSandboxIdentity>
  paths: SandboxStatePaths
  ports: ReturnType<typeof deriveSandboxPorts>
  urls: {
    hosted: ReturnType<typeof buildHostedSandboxUrls>
    local: ReturnType<typeof buildLocalSandboxUrls>
  }
}

const SANDBOX_ROOT_DIRECTORY = ".sandbox"

const getSandboxPaths = (
  repositoryRoot: string,
  slug: string
): SandboxStatePaths => {
  const root = join(repositoryRoot, SANDBOX_ROOT_DIRECTORY, slug)

  return {
    hosted: join(root, "hosted"),
    local: join(root, "local"),
    root,
  }
}

const writeSandboxModeFiles = ({
  directory,
  envFiles,
}: {
  directory: string
  envFiles: ReturnType<typeof buildSandboxEnvFiles>
}) => {
  const writes = [
    Effect.tryPromise(() =>
      writeFile(join(directory, "api.env"), envFiles.api, "utf8")
    ),
    Effect.tryPromise(() =>
      writeFile(join(directory, "auth.env"), envFiles.auth, "utf8")
    ),
    Effect.tryPromise(() =>
      writeFile(join(directory, "compose.env"), envFiles.compose, "utf8")
    ),
    Effect.tryPromise(() =>
      writeFile(join(directory, "postgres.env"), envFiles.postgres, "utf8")
    ),
    Effect.tryPromise(() =>
      writeFile(join(directory, "web.env"), envFiles.web, "utf8")
    ),
  ]

  const electricEnv = envFiles.electric

  if (electricEnv) {
    writes.push(
      Effect.tryPromise(() =>
        writeFile(join(directory, "electric.env"), electricEnv, "utf8")
      )
    )
  } else {
    writes.push(
      Effect.tryPromise(() =>
        rm(join(directory, "electric.env"), {
          force: true,
        })
      )
    )
  }

  return Effect.all(writes).pipe(Effect.asVoid)
}

const createSandboxState = ({
  emailFrom,
  hostedDomainRoot,
  name,
  repositoryRoot,
}: CreateSandboxStateOptions) => {
  const identity = deriveSandboxIdentity(name)
  const ports = deriveSandboxPorts(identity.hash)
  const paths = getSandboxPaths(repositoryRoot, identity.slug)
  const state: SandboxState = {
    createdAt: new Date().toISOString(),
    hostedDomainRoot,
    identity,
    paths,
    ports,
    urls: {
      hosted: buildHostedSandboxUrls({
        domainRoot: hostedDomainRoot,
        slug: identity.slug,
      }),
      local: buildLocalSandboxUrls(identity.slug),
    },
  }

  return Effect.gen(function* createStateEffect() {
    yield* Effect.tryPromise(() =>
      mkdir(paths.local, {
        recursive: true,
      })
    )
    yield* Effect.tryPromise(() =>
      mkdir(paths.hosted, {
        recursive: true,
      })
    )
    yield* writeSandboxModeFiles({
      directory: paths.local,
      envFiles: buildSandboxEnvFiles({
        emailFrom,
        hostedDomainRoot,
        identity,
        mode: "local",
        ports,
        postgresPassword: "postgres",
        postgresUser: "postgres",
        repositoryRoot,
      }),
    })
    yield* writeSandboxModeFiles({
      directory: paths.hosted,
      envFiles: buildSandboxEnvFiles({
        emailFrom,
        hostedDomainRoot,
        identity,
        mode: "hosted",
        ports,
        postgresPassword: "postgres",
        postgresUser: "postgres",
        repositoryRoot,
      }),
    })
    yield* Effect.tryPromise(() =>
      writeFile(
        join(paths.root, "sandbox.json"),
        `${JSON.stringify(state, null, 2)}\n`,
        "utf8"
      )
    )

    return state
  })
}

const loadSandboxState = ({
  name,
  repositoryRoot,
}: LoadSandboxStateOptions) => {
  const identity = deriveSandboxIdentity(name)
  const paths = getSandboxPaths(repositoryRoot, identity.slug)

  return Effect.tryPromise(async () => {
    const sandboxJson = await readFile(join(paths.root, "sandbox.json"), "utf8")

    return JSON.parse(sandboxJson) as SandboxState
  })
}

const listSandboxStates = ({ repositoryRoot }: ListSandboxStatesOptions) =>
  Effect.tryPromise(async () => {
    const sandboxRoot = join(repositoryRoot, SANDBOX_ROOT_DIRECTORY)

    try {
      const entries = await readdir(sandboxRoot, {
        withFileTypes: true,
      })
      const sandboxes = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const sandboxJson = await readFile(
              join(sandboxRoot, entry.name, "sandbox.json"),
              "utf8"
            )

            return JSON.parse(sandboxJson) as SandboxState
          })
      )

      const sortedSandboxes = [...sandboxes]

      sortedSandboxes.sort((left: SandboxState, right: SandboxState) =>
        left.identity.slug.localeCompare(right.identity.slug)
      )

      return sortedSandboxes
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return []
      }

      throw error
    }
  })

export {
  createSandboxState,
  getSandboxPaths,
  listSandboxStates,
  loadSandboxState,
  SANDBOX_ROOT_DIRECTORY,
}
export type {
  CreateSandboxStateOptions,
  ListSandboxStatesOptions,
  LoadSandboxStateOptions,
  SandboxState,
  SandboxStatePaths,
}
