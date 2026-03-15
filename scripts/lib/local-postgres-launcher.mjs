import { argv } from "node:process"

export const LAUNCHER_USAGE =
  'Expected a child command after "--". Example: node scripts/dev/local-postgres-launcher.mjs -- tsx watch src/index.ts'

export const parseLauncherCommandArgs = (argvInput = argv) => {
  const separatorIndex = argvInput.indexOf("--")
  const commandTokens =
    separatorIndex === -1 ? argvInput.slice(2) : argvInput.slice(separatorIndex + 1)
  const [command, ...args] = commandTokens

  if (typeof command !== "string" || command.length === 0) {
    throw new Error(LAUNCHER_USAGE)
  }

  return { args, command }
}

export const buildLocalPostgresChildEnv = ({ baseEnv, databaseUrl }) => ({
  ...baseEnv,
  DATABASE_URL: databaseUrl,
})
