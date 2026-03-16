const DEFAULT_AUTH_PORT = 3002
const DEFAULT_PORTLESS_AUTH_URL = "https://auth.tskr.localhost:1355"
const DEFAULT_PORTLESS_WEB_URL = "https://web.tskr.localhost:1355"
const DEFAULT_DIRECT_AUTH_URL = `http://localhost:${DEFAULT_AUTH_PORT}`
const DEFAULT_DIRECT_WEB_URLS = [
  "http://localhost:3000",
  "http://localhost:5173",
]
const DEFAULT_DEV_SECRET = "dev-secret-dev-secret-dev-secret-dev-secret"

interface AuthenticationEnv {
  betterAuthSecret: string
  betterAuthUrl: string
  trustedOrigins: string[]
}

const unique = (values: string[]) => [...new Set(values)]

const splitCsv = (value?: string) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? []

const resolveDefaultAuthUrl = () =>
  process.env.PORTLESS === "0"
    ? DEFAULT_DIRECT_AUTH_URL
    : DEFAULT_PORTLESS_AUTH_URL

const resolveDefaultTrustedOrigins = () => {
  const directOrigins =
    process.env.PORTLESS === "0"
      ? [DEFAULT_DIRECT_AUTH_URL, ...DEFAULT_DIRECT_WEB_URLS]
      : []

  return unique([DEFAULT_PORTLESS_WEB_URL, ...directOrigins])
}

const requireValue = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`${name} must be set`)
  }

  return value
}

const parseAuthenticationEnv = (): AuthenticationEnv => ({
  betterAuthSecret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? requireValue(process.env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET")
      : DEFAULT_DEV_SECRET),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? resolveDefaultAuthUrl(),
  trustedOrigins: unique([
    ...resolveDefaultTrustedOrigins(),
    ...splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ]),
})

export { parseAuthenticationEnv }
export type { AuthenticationEnv }
