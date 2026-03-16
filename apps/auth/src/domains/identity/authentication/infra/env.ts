const DEFAULT_AUTH_PORT = 3002
const DEFAULT_PORTLESS_AUTH_URL = "https://auth.tskr.localhost:1355"
const DEFAULT_PORTLESS_WEB_URL = "https://web.tskr.localhost:1355"
const DEFAULT_DIRECT_AUTH_URL = `http://localhost:${DEFAULT_AUTH_PORT}`
const DEFAULT_DIRECT_WEB_URL = "http://localhost:3000"
const DEFAULT_DIRECT_WEB_URLS = [
  DEFAULT_DIRECT_WEB_URL,
  "http://localhost:5173",
]
const DEFAULT_DEV_SECRET = "dev-secret-dev-secret-dev-secret-dev-secret"
const DEFAULT_DEV_EMAIL_PROVIDER = "console"
const DEFAULT_PRODUCTION_EMAIL_PROVIDER = "resend"

type EmailProvider = "console" | "resend"

interface AuthenticationEnv {
  betterAuthSecret: string
  betterAuthUrl: string
  databaseUrl: string
  emailFrom: string
  emailProvider: EmailProvider
  emailReplyTo?: string
  resendApiKey?: string
  trustedOrigins: string[]
  webBaseUrl: string
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

const resolveDefaultWebBaseUrl = () =>
  process.env.PORTLESS === "0"
    ? DEFAULT_DIRECT_WEB_URL
    : DEFAULT_PORTLESS_WEB_URL

const requireValue = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`${name} must be set`)
  }

  return value
}

const parseEmailProvider = (
  value: string | undefined,
  nodeEnvironment: string | undefined
): EmailProvider => {
  if (!value) {
    return nodeEnvironment === "production"
      ? DEFAULT_PRODUCTION_EMAIL_PROVIDER
      : DEFAULT_DEV_EMAIL_PROVIDER
  }

  const normalizedValue = value.trim().toLowerCase()
  if (normalizedValue === "console" || normalizedValue === "resend") {
    return normalizedValue
  }

  throw new Error(`EMAIL_PROVIDER must be one of: console, resend`)
}

const resolveResendApiKey = (
  provider: EmailProvider,
  value: string | undefined
) => {
  if (provider !== "resend") {
    return undefined
  }

  if (!value) {
    throw new Error("RESEND_API_KEY must be set when EMAIL_PROVIDER is resend")
  }

  return value
}

const parseAuthenticationEnv = (): AuthenticationEnv => {
  const emailProvider = parseEmailProvider(
    process.env.EMAIL_PROVIDER,
    process.env.NODE_ENV
  )

  return {
    betterAuthSecret:
      process.env.BETTER_AUTH_SECRET ??
      (process.env.NODE_ENV === "production"
        ? requireValue(process.env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET")
        : DEFAULT_DEV_SECRET),
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? resolveDefaultAuthUrl(),
    databaseUrl: requireValue(process.env.DATABASE_URL, "DATABASE_URL"),
    emailFrom: requireValue(process.env.EMAIL_FROM, "EMAIL_FROM"),
    emailProvider,
    emailReplyTo: process.env.EMAIL_REPLY_TO,
    resendApiKey: resolveResendApiKey(emailProvider, process.env.RESEND_API_KEY),
    trustedOrigins: unique([
      ...resolveDefaultTrustedOrigins(),
      ...splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    ]),
    webBaseUrl: process.env.WEB_BASE_URL ?? resolveDefaultWebBaseUrl(),
  }
}

export { parseAuthenticationEnv }
export type { AuthenticationEnv, EmailProvider }
