import { createHash } from "node:crypto"

export const DEFAULT_POSTGRES_HOST = "127.0.0.1"
export const DEFAULT_POSTGRES_USER = "postgres"
export const DEFAULT_POSTGRES_PASSWORD = "postgres"
export const DEFAULT_POSTGRES_DATABASE = "app"
export const DEFAULT_POSTGRES_IMAGE = "postgres:16-alpine"
export const DEFAULT_PORT_MIN = 20000
export const DEFAULT_PORT_MAX = 29999

export const deriveWorktreeIdentity = (canonicalPath) => {
  if (typeof canonicalPath !== "string" || canonicalPath.trim().length === 0) {
    throw new TypeError("canonicalPath must be a non-empty string")
  }

  const trimmedPath = canonicalPath.trim()
  const hashHex = createHash("sha256").update(trimmedPath).digest("hex")
  const shortHash = hashHex.slice(0, 10)

  return {
    canonicalPath: trimmedPath,
    hashHex,
    projectName: `tskr-postgres-${shortHash}`,
  }
}

export const deriveDeterministicPort = (
  hashHex,
  { maxPort = DEFAULT_PORT_MAX, minPort = DEFAULT_PORT_MIN } = {}
) => {
  if (typeof hashHex !== "string" || hashHex.length < 6) {
    throw new TypeError("hashHex must be a hex string")
  }

  const range = maxPort - minPort + 1
  if (range <= 0) {
    throw new RangeError("Invalid port range")
  }

  const value = Number.parseInt(hashHex.slice(0, 12), 16)
  if (!Number.isFinite(value)) {
    throw new TypeError("hashHex must start with valid hexadecimal characters")
  }

  return minPort + (value % range)
}

export const deriveWorktreeDbConfig = (
  canonicalPath,
  {
    database = DEFAULT_POSTGRES_DATABASE,
    host = DEFAULT_POSTGRES_HOST,
    image = DEFAULT_POSTGRES_IMAGE,
    password = DEFAULT_POSTGRES_PASSWORD,
    user = DEFAULT_POSTGRES_USER,
  } = {}
) => {
  const identity = deriveWorktreeIdentity(canonicalPath)
  const port = deriveDeterministicPort(identity.hashHex)
  const encodedUser = encodeURIComponent(user)
  const encodedPassword = encodeURIComponent(password)

  return {
    canonicalPath: identity.canonicalPath,
    containerName: `${identity.projectName}-db`,
    database,
    databaseUrl: `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`,
    hashHex: identity.hashHex,
    host,
    image,
    password,
    port,
    projectName: identity.projectName,
    user,
  }
}
