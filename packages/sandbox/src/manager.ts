import { rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { Context, Effect, Layer, Option } from "effect"

import { buildComposeArgs } from "./compose.js"
import {
  buildPortlessAliasArgs,
  buildPortlessAliasName,
  buildPortlessRemoveAliasArgs,
} from "./portless.js"
import { runCheckedCommand } from "./process.js"
import {
  createSandboxState,
  getSandboxPaths,
  listSandboxStates,
  loadSandboxState,
} from "./store.js"
import type { SandboxState } from "./store.js"

type SandboxMode = "hosted" | "local"
type SandboxService = "api" | "auth" | "ingress" | "postgres" | "web"

interface CreateSandboxInput {
  hostedDomainRoot?: string
  name: string
}

interface DestroySandboxInput {
  mode: SandboxMode
  name: string
}

interface LogsSandboxInput {
  mode: SandboxMode
  name: string
  service: Option.Option<SandboxService>
}

interface SandboxUrlsInput {
  mode: SandboxMode
  name: string
}

interface StartSandboxInput {
  mode: SandboxMode
  name: string
}

interface StopSandboxInput {
  mode: SandboxMode
  name: string
}

interface SandboxDoctorReport {
  docker: "ok"
  portless: "missing" | "ok"
}

const DEFAULT_HOSTED_DOMAIN_ROOT = "sandboxes.example.com"
const DEFAULT_EMAIL_FROM = "TSKR <noreply@localhost>"
const LOCAL_PORTLESS_SERVICES = ["web", "api", "auth"] as const
const REPOSITORY_ROOT = resolve(
  fileURLToPath(new URL("../../..", import.meta.url))
)

class SandboxManager extends Context.Tag("@workspace/sandbox/SandboxManager")<
  SandboxManager,
  {
    create: (input: CreateSandboxInput) => Effect.Effect<SandboxState, Error>
    destroy: (input: DestroySandboxInput) => Effect.Effect<void, Error>
    doctor: () => Effect.Effect<SandboxDoctorReport, Error>
    list: () => Effect.Effect<readonly SandboxState[], Error>
    logs: (input: LogsSandboxInput) => Effect.Effect<void, Error>
    start: (input: StartSandboxInput) => Effect.Effect<SandboxState, Error>
    stop: (input: StopSandboxInput) => Effect.Effect<void, Error>
    urls: (
      input: SandboxUrlsInput
    ) => Effect.Effect<SandboxState["urls"][SandboxMode], Error>
  }
>() {}

const getRepositoryRoot = () => REPOSITORY_ROOT

const getComposeEnvFilePath = (state: SandboxState, mode: SandboxMode) =>
  join(mode === "local" ? state.paths.local : state.paths.hosted, "compose.env")

const getLocalPortlessAliasName = (
  service: (typeof LOCAL_PORTLESS_SERVICES)[number],
  state: SandboxState
) =>
  buildPortlessAliasName({
    service,
    slug: state.identity.slug,
  })

const runLocalPortlessAliasEffects = (
  buildEffect: (
    service: (typeof LOCAL_PORTLESS_SERVICES)[number]
  ) => Effect.Effect<unknown, Error>
) =>
  Effect.all(
    LOCAL_PORTLESS_SERVICES.map((service) => buildEffect(service))
  ).pipe(Effect.asVoid)

const ensureLocalPortlessAliases = (state: SandboxState) =>
  runLocalPortlessAliasEffects((service) =>
    runCheckedCommand({
      args: buildPortlessAliasArgs({
        name: getLocalPortlessAliasName(service, state),
        port: state.ports[service],
      }),
      command: "portless",
      stdio: "inherit",
    })
  )

const removeLocalPortlessAliases = (state: SandboxState) =>
  runLocalPortlessAliasEffects((service) =>
    runCheckedCommand({
      args: buildPortlessRemoveAliasArgs(
        getLocalPortlessAliasName(service, state)
      ),
      command: "portless",
      stdio: "inherit",
    }).pipe(Effect.ignore)
  )

const runComposeCommand = ({
  mode,
  state,
  subcommand,
}: {
  mode: SandboxMode
  state: SandboxState
  subcommand: string[]
}) =>
  runCheckedCommand({
    args: buildComposeArgs({
      envFilePath: getComposeEnvFilePath(state, mode),
      mode,
      projectName: state.identity.projectName,
      repositoryRoot: getRepositoryRoot(),
      subcommand,
    }),
    command: "docker",
    cwd: getRepositoryRoot(),
    stdio: "inherit",
  }).pipe(Effect.asVoid)

const SandboxManagerLive = Layer.succeed(SandboxManager, {
  create: ({ hostedDomainRoot = DEFAULT_HOSTED_DOMAIN_ROOT, name }) =>
    createSandboxState({
      emailFrom: DEFAULT_EMAIL_FROM,
      hostedDomainRoot,
      name,
      repositoryRoot: getRepositoryRoot(),
    }),
  destroy: ({ mode, name }) =>
    Effect.gen(function* destroy() {
      const state = yield* loadSandboxState({
        name,
        repositoryRoot: getRepositoryRoot(),
      })

      yield* runComposeCommand({
        mode,
        state,
        subcommand: ["down", "--remove-orphans", "--volumes"],
      }).pipe(Effect.ignore)

      if (mode === "local") {
        yield* removeLocalPortlessAliases(state)
      }

      yield* Effect.tryPromise(() =>
        rm(getSandboxPaths(getRepositoryRoot(), state.identity.slug).root, {
          force: true,
          recursive: true,
        })
      )
    }),
  doctor: () =>
    Effect.gen(function* doctor() {
      yield* runCheckedCommand({
        args: ["--version"],
        command: "docker",
      })
      yield* runCheckedCommand({
        args: ["info"],
        command: "docker",
      })
      const portless = yield* runCheckedCommand({
        args: ["--help"],
        command: "portless",
      }).pipe(
        Effect.as("ok" as const),
        Effect.catchAll(() => Effect.succeed("missing" as const))
      )

      return {
        docker: "ok",
        portless,
      } satisfies SandboxDoctorReport
    }),
  list: () =>
    listSandboxStates({
      repositoryRoot: getRepositoryRoot(),
    }),
  logs: ({ mode, name, service }) =>
    Effect.gen(function* logs() {
      const state = yield* loadSandboxState({
        name,
        repositoryRoot: getRepositoryRoot(),
      })
      const serviceName = Option.getOrUndefined(service)

      yield* runComposeCommand({
        mode,
        state,
        subcommand: [
          "logs",
          "--follow",
          "--tail",
          "200",
          ...(serviceName ? [serviceName] : []),
        ],
      })
    }),
  start: ({ mode, name }) =>
    Effect.gen(function* start() {
      const existingState = yield* loadSandboxState({
        name,
        repositoryRoot: getRepositoryRoot(),
      })
      const state = yield* createSandboxState({
        emailFrom: DEFAULT_EMAIL_FROM,
        hostedDomainRoot: existingState.hostedDomainRoot,
        name: existingState.identity.name,
        repositoryRoot: getRepositoryRoot(),
      })

      if (mode === "local") {
        yield* ensureLocalPortlessAliases(state)
      }

      yield* runComposeCommand({
        mode,
        state,
        subcommand: mode === "hosted" ? ["up", "-d", "--build"] : ["up", "-d"],
      })

      return state
    }),
  stop: ({ mode, name }) =>
    Effect.gen(function* stop() {
      const state = yield* loadSandboxState({
        name,
        repositoryRoot: getRepositoryRoot(),
      })

      yield* runComposeCommand({
        mode,
        state,
        subcommand: ["down", "--remove-orphans"],
      })

      if (mode === "local") {
        yield* removeLocalPortlessAliases(state)
      }
    }),
  urls: ({ mode, name }) =>
    loadSandboxState({
      name,
      repositoryRoot: getRepositoryRoot(),
    }).pipe(Effect.map((state) => state.urls[mode])),
})

export { DEFAULT_HOSTED_DOMAIN_ROOT, SandboxManager, SandboxManagerLive }
export type {
  CreateSandboxInput,
  DestroySandboxInput,
  LogsSandboxInput,
  SandboxDoctorReport,
  SandboxMode,
  SandboxService,
  SandboxUrlsInput,
  StartSandboxInput,
  StopSandboxInput,
}
