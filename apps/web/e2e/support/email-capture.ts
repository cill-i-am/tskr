/* oxlint-disable unicorn/no-await-expression-member */

import { mkdir, readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"

interface CapturedEmail<TPayload = unknown> {
  capturedAt: string
  payload: TPayload
  type: string
}

const clearEmailCaptures = async (directory: string) => {
  await rm(directory, {
    force: true,
    recursive: true,
  })

  await mkdir(directory, {
    recursive: true,
  })
}

const readCapturedEmails = async (
  directory: string
): Promise<CapturedEmail[]> => {
  try {
    const directoryEntries = await readdir(directory)
    const files = directoryEntries.toSorted()

    return await Promise.all(
      files.map(async (file) =>
        JSON.parse(await readFile(join(directory, file), "utf8"))
      )
    )
  } catch {
    return []
  }
}

const waitForCapturedEmails = async <TPayload>({
  directory,
  minCount = 1,
  predicate,
  timeoutMs = 15_000,
}: {
  directory: string
  minCount?: number
  predicate?: (email: CapturedEmail<TPayload>) => boolean
  timeoutMs?: number
}) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const capturedEmails = await readCapturedEmails(directory)
    const emails = capturedEmails.filter(
      predicate ?? (() => true)
    ) as CapturedEmail<TPayload>[]

    if (emails.length >= minCount) {
      return emails
    }

    await delay(250)
  }

  throw new Error("Timed out waiting for a captured E2E email.")
}

const waitForCapturedEmail = async <TPayload>(
  options: Parameters<typeof waitForCapturedEmails<TPayload>>[0]
) => {
  const emails = await waitForCapturedEmails(options)

  return emails.at(-1)
}

export type { CapturedEmail }
export {
  clearEmailCaptures,
  readCapturedEmails,
  waitForCapturedEmail,
  waitForCapturedEmails,
}
