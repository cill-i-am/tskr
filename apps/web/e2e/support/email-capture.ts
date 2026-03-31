/* oxlint-disable unicorn/no-await-expression-member */

import { mkdir, readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"

interface CapturedEmail<TPayload = unknown> {
  capturedAt: string
  payload: TPayload
  type: string
}

interface CapturedEmailSnapshot {
  emails: CapturedEmail[]
  files: string[]
}

const sortFiles = (files: string[]) => [...files].sort()

const clearEmailCaptures = async (directory: string) => {
  await rm(directory, {
    force: true,
    recursive: true,
  })

  await mkdir(directory, {
    recursive: true,
  })
}

const readCapturedEmailFiles = async (
  directory: string,
  files: string[]
): Promise<CapturedEmail[]> =>
  await Promise.all(
    files.map(async (file) =>
      JSON.parse(await readFile(join(directory, file), "utf8"))
    )
  )

const readCapturedEmails = async (
  directory: string
): Promise<CapturedEmail[]> => {
  try {
    const directoryEntries = await readdir(directory)
    const files = sortFiles(directoryEntries)

    return await readCapturedEmailFiles(directory, files)
  } catch {
    return []
  }
}

const readCapturedEmailSnapshot = async (
  directory: string,
  previousSnapshot: CapturedEmailSnapshot
): Promise<CapturedEmailSnapshot> => {
  try {
    const files = sortFiles(await readdir(directory))
    const currentFiles = new Set(files)

    const shouldReloadAll =
      files.length < previousSnapshot.files.length ||
      previousSnapshot.files.some((file) => !currentFiles.has(file))

    if (shouldReloadAll) {
      return {
        emails: await readCapturedEmailFiles(directory, files),
        files,
      }
    }

    const knownFiles = new Set(previousSnapshot.files)
    const nextFiles = files.filter((file) => !knownFiles.has(file))

    if (nextFiles.length === 0) {
      return previousSnapshot
    }

    return {
      emails: [
        ...previousSnapshot.emails,
        ...(await readCapturedEmailFiles(directory, nextFiles)),
      ],
      files,
    }
  } catch {
    return {
      emails: [],
      files: [],
    }
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
  const matches =
    predicate === undefined
      ? () => true
      : (email: CapturedEmail<unknown>) =>
          predicate(email as CapturedEmail<TPayload>)
  let snapshot: CapturedEmailSnapshot = {
    emails: [],
    files: [],
  }

  while (Date.now() < deadline) {
    snapshot = await readCapturedEmailSnapshot(directory, snapshot)
    const emails = snapshot.emails.filter(matches) as CapturedEmail<TPayload>[]

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
