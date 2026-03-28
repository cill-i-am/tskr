import { spawn } from "node:child_process"
import { once } from "node:events"

/**
 * Spawn a command, capture stdout and stderr, and return the exit
 * code together with the captured output.
 *
 * @param {string} command - The executable to run.
 * @param {string[]} args - Arguments passed to the command.
 * @param {{ cwd?: string; env?: NodeJS.ProcessEnv; stdio?: import("node:child_process").StdioOptions }} [options] - Spawn options forwarded to `child_process.spawn`.
 * @returns {Promise<{ code: number; stdout: string; stderr: string }>} Resolved when the process exits.
 */
export const runCommand = async (command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
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

  return { code, stderr, stdout }
}
