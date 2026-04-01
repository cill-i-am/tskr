import { createHash } from "node:crypto"
import { join } from "node:path"

const DEFAULT_SANDBOX_SLUG = "sandbox"
const DEFAULT_ELECTRIC_INTERNAL_PORT = 3000
const DEFAULT_ELECTRIC_STORAGE_DIR = "/var/lib/electric/persistent"
const DEFAULT_POSTGRES_DATABASE = "app"
const DEFAULT_POSTGRES_HOST = "postgres"
const DEFAULT_POSTGRES_INTERNAL_PORT = 5432
const DEFAULT_PUBLIC_PORT_BASE = 41_000
const DEFAULT_PUBLIC_PORT_RANGE = 4000

type SandboxMode = "hosted" | "local"

interface SandboxIdentity {
  hash: string
  name: string
  projectName: string
  slug: string
}

interface SandboxPorts {
  api: number
  auth: number
  electric: number
  ingress: number
  postgres: number
  web: number
}

interface SandboxUrls {
  api: string
  auth: string
  web: string
}

interface BuildHostedSandboxUrlsOptions {
  domainRoot: string
  slug: string
}

interface BuildSandboxEnvFilesOptions {
  emailFrom: string
  hostedDomainRoot: string
  identity: SandboxIdentity
  mode: SandboxMode
  ports: SandboxPorts
  postgresPassword: string
  postgresUser: string
  repositoryRoot: string
}

interface SandboxEnvFiles {
  api: string
  auth: string
  compose: string
  electric?: string
  postgres: string
  web: string
}

const slugifySandboxName = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")

  return slug.length > 0 ? slug : DEFAULT_SANDBOX_SLUG
}

const buildDatabaseUrl = ({
  password,
  user,
}: {
  password: string
  user: string
}) =>
  `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${DEFAULT_POSTGRES_HOST}:${DEFAULT_POSTGRES_INTERNAL_PORT}/${DEFAULT_POSTGRES_DATABASE}`

const buildSandboxSecret = (hash: string) =>
  `sandbox-${hash}-sandbox-${hash}-sandbox-${hash}`

const stringifyEnvFile = (entries: Record<string, string | number>) =>
  `${Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`

const getModeStateDirectory = ({
  mode,
  repositoryRoot,
  slug,
}: {
  mode: SandboxMode
  repositoryRoot: string
  slug: string
}) => join(repositoryRoot, ".sandbox", slug, mode)

const deriveBasePort = (hash: string) =>
  DEFAULT_PUBLIC_PORT_BASE +
  (Number.parseInt(hash.slice(0, 8), 16) % DEFAULT_PUBLIC_PORT_RANGE)

const deriveSandboxIdentity = (name: string): SandboxIdentity => {
  const normalizedName = name.trim()
  const slug = slugifySandboxName(normalizedName)
  const hash = createHash("sha256")
    .update(normalizedName)
    .digest("hex")
    .slice(0, 6)

  return {
    hash,
    name: normalizedName,
    projectName: `tskr-sandbox-${slug}-${hash}`,
    slug,
  }
}

const deriveSandboxPorts = (hash: string): SandboxPorts => {
  const basePort = deriveBasePort(hash)

  return {
    api: basePort,
    auth: basePort + 1,
    electric: basePort + 5,
    ingress: basePort + 4,
    postgres: basePort + 3,
    web: basePort + 2,
  }
}

const buildLocalSandboxUrls = (slug: string): SandboxUrls => ({
  api: `https://${slug}.api.tskr.localhost`,
  auth: `https://${slug}.auth.tskr.localhost`,
  web: `https://${slug}.web.tskr.localhost`,
})

const buildHostedSandboxUrls = ({
  domainRoot,
  slug,
}: BuildHostedSandboxUrlsOptions): SandboxUrls => ({
  api: `https://api.${slug}.${domainRoot}`,
  auth: `https://auth.${slug}.${domainRoot}`,
  web: `https://web.${slug}.${domainRoot}`,
})

const buildSandboxEnvFiles = ({
  emailFrom,
  hostedDomainRoot,
  identity,
  mode,
  ports,
  postgresPassword,
  postgresUser,
  repositoryRoot,
}: BuildSandboxEnvFilesOptions): SandboxEnvFiles => {
  const appNodeEnv = mode === "hosted" ? "production" : "development"
  const modeStateDirectory = getModeStateDirectory({
    mode,
    repositoryRoot,
    slug: identity.slug,
  })
  const urls =
    mode === "local"
      ? buildLocalSandboxUrls(identity.slug)
      : buildHostedSandboxUrls({
          domainRoot: hostedDomainRoot,
          slug: identity.slug,
        })
  const hostedDomains = {
    api: `api.${identity.slug}.${hostedDomainRoot}`,
    auth: `auth.${identity.slug}.${hostedDomainRoot}`,
    web: `web.${identity.slug}.${hostedDomainRoot}`,
  }
  const databaseUrl = buildDatabaseUrl({
    password: postgresPassword,
    user: postgresUser,
  })

  return {
    api: stringifyEnvFile({
      DATABASE_URL: databaseUrl,
      NODE_ENV: appNodeEnv,
      PORT: 3001,
      SERVER_AUTH_BASE_URL: mode === "local" ? "http://auth:3002" : urls.auth,
      ...(mode === "local"
        ? {
            ELECTRIC_URL: "http://electric:3000",
          }
        : {}),
    }),
    auth: stringifyEnvFile({
      BETTER_AUTH_SECRET: buildSandboxSecret(identity.hash),
      BETTER_AUTH_TRUSTED_ORIGINS: urls.web,
      BETTER_AUTH_URL: urls.auth,
      DATABASE_URL: databaseUrl,
      EMAIL_FROM: emailFrom,
      EMAIL_PROVIDER: "console",
      NODE_ENV: appNodeEnv,
      PORT: 3002,
      PORTLESS: 0,
      WEB_BASE_URL: urls.web,
    }),
    compose: stringifyEnvFile({
      POSTGRES_CONTAINER_NAME: `${identity.projectName}-postgres`,
      SANDBOX_API_DOMAIN: hostedDomains.api,
      SANDBOX_API_PORT: ports.api,
      SANDBOX_AUTH_DOMAIN: hostedDomains.auth,
      SANDBOX_AUTH_PORT: ports.auth,
      SANDBOX_ENV_API_FILE: join(modeStateDirectory, "api.env"),
      SANDBOX_ENV_AUTH_FILE: join(modeStateDirectory, "auth.env"),
      SANDBOX_ENV_POSTGRES_FILE: join(modeStateDirectory, "postgres.env"),
      SANDBOX_ENV_WEB_FILE: join(modeStateDirectory, "web.env"),
      SANDBOX_HOSTED_DOMAIN_ROOT: hostedDomainRoot,
      SANDBOX_INGRESS_PORT: ports.ingress,
      SANDBOX_MODE: mode,
      SANDBOX_NAME: identity.slug,
      SANDBOX_POSTGRES_PORT: ports.postgres,
      SANDBOX_PROJECT_NAME: identity.projectName,
      SANDBOX_REPOSITORY_ROOT: repositoryRoot,
      SANDBOX_WEB_DOMAIN: hostedDomains.web,
      SANDBOX_WEB_PORT: ports.web,
      ...(mode === "local"
        ? {
            SANDBOX_ELECTRIC_PORT: ports.electric,
            SANDBOX_ENV_ELECTRIC_FILE: join(modeStateDirectory, "electric.env"),
          }
        : {}),
    }),
    electric:
      mode === "local"
        ? stringifyEnvFile({
            DATABASE_URL: databaseUrl,
            ELECTRIC_INSECURE: "true",
            ELECTRIC_PORT: DEFAULT_ELECTRIC_INTERNAL_PORT,
            ELECTRIC_STORAGE_DIR: DEFAULT_ELECTRIC_STORAGE_DIR,
          })
        : undefined,
    postgres: stringifyEnvFile({
      POSTGRES_DB: DEFAULT_POSTGRES_DATABASE,
      POSTGRES_HOST_PORT: ports.postgres,
      POSTGRES_PASSWORD: postgresPassword,
      POSTGRES_USER: postgresUser,
    }),
    web: stringifyEnvFile({
      NODE_ENV: appNodeEnv,
      PORT: 3000,
      PORTLESS: 0,
      SERVER_AUTH_BASE_URL: "http://auth:3002",
      VITE_AUTH_BASE_URL: urls.auth,
    }),
  }
}

export {
  buildHostedSandboxUrls,
  buildLocalSandboxUrls,
  buildSandboxEnvFiles,
  deriveSandboxIdentity,
  deriveSandboxPorts,
}
export type {
  BuildSandboxEnvFilesOptions,
  BuildHostedSandboxUrlsOptions,
  SandboxEnvFiles,
  SandboxIdentity,
  SandboxMode,
  SandboxPorts,
  SandboxUrls,
}
