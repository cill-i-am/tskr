import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const toCapturePath = (directory: string) =>
  join(directory, `${Date.now()}-${crypto.randomUUID()}.json`)

const captureE2eEmail = async ({
  directory,
  payload,
  type,
}: {
  directory: string
  payload: unknown
  type: string
}) => {
  await mkdir(directory, {
    recursive: true,
  })

  await writeFile(
    toCapturePath(directory),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        payload,
        type,
      },
      null,
      2
    )
  )
}

export { captureE2eEmail }
