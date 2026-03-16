export const resolveDatabaseUrl = (options?: {
  databaseUrl?: string
  env?: NodeJS.ProcessEnv
}): string => {
  const url =
    options?.databaseUrl ??
    options?.env?.DATABASE_URL ??
    process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL must be set")
  }

  return url
}
