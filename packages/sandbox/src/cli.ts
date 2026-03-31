import { fileURLToPath } from "node:url"

import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Layer, Option } from "effect"

import {
  DEFAULT_HOSTED_DOMAIN_ROOT,
  SandboxManager,
  SandboxManagerLive,
} from "./manager.js"
import type { SandboxMode, SandboxService } from "./manager.js"

const sandboxModeOption = Options.choice("mode", [
  "local",
  "hosted",
] as const).pipe(Options.optional)
const hostedDomainRootOption = Options.text("hosted-domain-root").pipe(
  Options.optional
)
const sandboxNameArgument = Args.text({
  name: "name",
})
const sandboxServiceOption = Options.choice("service", [
  "api",
  "auth",
  "electric",
  "ingress",
  "postgres",
  "web",
] as const).pipe(Options.optional)

const resolveSandboxMode = (mode: Option.Option<SandboxMode>): SandboxMode =>
  Option.getOrElse(mode, () => "local")

const renderUrls = ({
  api,
  auth,
  web,
}: {
  api: string
  auth: string
  web: string
}) => `web: ${web}\nauth: ${auth}\napi: ${api}`

const createCommand = Command.make(
  "create",
  {
    hostedDomainRoot: hostedDomainRootOption,
    name: sandboxNameArgument,
  },
  ({ hostedDomainRoot, name }) =>
    Effect.gen(function* createSandboxEffect() {
      const state = yield* SandboxManager
      const sandbox = yield* state.create({
        hostedDomainRoot: Option.getOrUndefined(hostedDomainRoot),
        name,
      })

      yield* Console.log(
        `Created sandbox ${sandbox.identity.slug}\n${renderUrls(sandbox.urls.local)}`
      )
    })
)

const startCommand = Command.make(
  "start",
  {
    mode: sandboxModeOption,
    name: sandboxNameArgument,
  },
  ({ mode, name }) =>
    Effect.gen(function* startSandboxEffect() {
      const sandboxManager = yield* SandboxManager
      const sandbox = yield* sandboxManager.start({
        mode: resolveSandboxMode(mode),
        name,
      })

      yield* Console.log(
        `Started sandbox ${sandbox.identity.slug} (${resolveSandboxMode(mode)})`
      )
    })
)

const stopCommand = Command.make(
  "stop",
  {
    mode: sandboxModeOption,
    name: sandboxNameArgument,
  },
  ({ mode, name }) =>
    Effect.gen(function* stopSandboxEffect() {
      const sandboxManager = yield* SandboxManager

      yield* sandboxManager.stop({
        mode: resolveSandboxMode(mode),
        name,
      })
      yield* Console.log(`Stopped sandbox ${name}`)
    })
)

const destroyCommand = Command.make(
  "destroy",
  {
    mode: sandboxModeOption,
    name: sandboxNameArgument,
  },
  ({ mode, name }) =>
    Effect.gen(function* destroySandboxEffect() {
      const sandboxManager = yield* SandboxManager

      yield* sandboxManager.destroy({
        mode: resolveSandboxMode(mode),
        name,
      })
      yield* Console.log(`Destroyed sandbox ${name}`)
    })
)

const listCommand = Command.make("list", {}, () =>
  Effect.gen(function* listSandboxesEffect() {
    const sandboxManager = yield* SandboxManager
    const sandboxes = yield* sandboxManager.list()

    if (sandboxes.length === 0) {
      yield* Console.log("No sandboxes found")

      return
    }

    yield* Console.log(
      sandboxes
        .map((sandbox) => `${sandbox.identity.slug} ${sandbox.urls.local.web}`)
        .join("\n")
    )
  })
)

const logsCommand = Command.make(
  "logs",
  {
    mode: sandboxModeOption,
    name: sandboxNameArgument,
    service: sandboxServiceOption,
  },
  ({ mode, name, service }) =>
    Effect.gen(function* logsSandboxEffect() {
      const sandboxManager = yield* SandboxManager

      yield* sandboxManager.logs({
        mode: resolveSandboxMode(mode),
        name,
        service: service as Option.Option<SandboxService>,
      })
    })
)

const urlsCommand = Command.make(
  "urls",
  {
    mode: sandboxModeOption,
    name: sandboxNameArgument,
  },
  ({ mode, name }) =>
    Effect.gen(function* renderSandboxUrlsEffect() {
      const sandboxManager = yield* SandboxManager
      const urls = yield* sandboxManager.urls({
        mode: resolveSandboxMode(mode),
        name,
      })

      yield* Console.log(renderUrls(urls))
    })
)

const doctorCommand = Command.make("doctor", {}, () =>
  Effect.gen(function* doctorSandboxEffect() {
    const sandboxManager = yield* SandboxManager
    const report = yield* sandboxManager.doctor()

    yield* Console.log(`docker: ${report.docker}\nportless: ${report.portless}`)
  })
)

const sandboxCommand = Command.make("sandbox", {}, () =>
  Console.log("Use a sandbox subcommand")
).pipe(
  Command.withSubcommands([
    createCommand,
    startCommand,
    stopCommand,
    destroyCommand,
    listCommand,
    logsCommand,
    urlsCommand,
    doctorCommand,
  ])
)

const sandboxCli = Command.run(sandboxCommand, {
  name: "TSKR Sandbox",
  version: "0.0.0",
})

const runSandboxCli = (argv: string[]) =>
  sandboxCli(argv).pipe(Effect.provide(SandboxManagerLive))

const mainLayer = Layer.mergeAll(NodeContext.layer, SandboxManagerLive)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sandboxCli(process.argv).pipe(Effect.provide(mainLayer), NodeRuntime.runMain)
}

export { DEFAULT_HOSTED_DOMAIN_ROOT, renderUrls, runSandboxCli }
