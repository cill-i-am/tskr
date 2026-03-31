type SandboxService = "api" | "auth" | "web"

interface BuildPortlessAliasArgsOptions {
  name: string
  port: number
}

interface BuildPortlessAliasNameOptions {
  service: SandboxService
  slug: string
}

const buildPortlessAliasName = ({
  service,
  slug,
}: BuildPortlessAliasNameOptions) => `${slug}.${service}.tskr`

const buildPortlessAliasArgs = ({
  name,
  port,
}: BuildPortlessAliasArgsOptions) => ["alias", name, `${port}`, "--force"]

const buildPortlessRemoveAliasArgs = (name: string) => [
  "alias",
  "--remove",
  name,
]

export {
  buildPortlessAliasArgs,
  buildPortlessAliasName,
  buildPortlessRemoveAliasArgs,
}
export type {
  BuildPortlessAliasArgsOptions,
  BuildPortlessAliasNameOptions,
  SandboxService,
}
