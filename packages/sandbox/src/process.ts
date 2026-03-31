import { spawn } from "node:child_process"
import { once } from "node:events"

import { Effect } from "effect"

interface RunCommandOptions {
  args: string[]
  command: string
  cwd?: string
  env?: NodeJS.ProcessEnv
  stdio?: "inherit" | "pipe"
}

interface CommandResult {
  code: number
  stderr: string
  stdout: string
}

const formatCommand = ({
  args,
  command,
}: Pick<RunCommandOptions, "args" | "command">) => [command, ...args].join(" ")

const runCommand = ({
  args,
  command,
  cwd,
  env,
  stdio = "pipe",
}: RunCommandOptions) =>
  Effect.tryPromise(async () => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: stdio === "inherit" ? "inherit" : ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout?.on("data", (chunk) => {
      stdout += chunk
    })

    child.stderr?.on("data", (chunk) => {
      stderr += chunk
    })

    const code = await Promise.race([
      once(child, "close").then(([exitCode]) => exitCode ?? 1),
      once(child, "error").then(([error]) => {
        throw error
      }),
    ])

    return {
      code,
      stderr,
      stdout,
    } satisfies CommandResult
  })

const runCheckedCommand = (options: RunCommandOptions) =>
  runCommand(options).pipe(
    Effect.flatMap((result) => {
      if (result.code === 0) {
        return Effect.succeed(result)
      }

      const output = `${result.stderr}\n${result.stdout}`.trim()

      return Effect.fail(
        new Error(
          output.length > 0
            ? `Command failed: ${formatCommand(options)}\n${output}`
            : `Command failed: ${formatCommand(options)}`
        )
      )
    })
  )

export { runCheckedCommand, runCommand }
export type { CommandResult, RunCommandOptions }
