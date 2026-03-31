interface ReadAuthServiceErrorMessageOptions {
  context?: string | undefined
}

const readAuthServiceErrorMessage = async (
  response: Response,
  { context }: ReadAuthServiceErrorMessageOptions = {}
) => {
  let message = context
    ? `${context} failed with status ${response.status}.`
    : `Auth service request failed with status ${response.status}.`

  try {
    const body = await response.text()
    const trimmedBody = body.trim()

    if (trimmedBody.length === 0) {
      return message
    }

    try {
      const payload = JSON.parse(trimmedBody) as {
        message?: string | undefined
      }

      if (payload.message) {
        ;({ message } = payload)
      }
    } catch {
      message = trimmedBody
    }
  } catch {
    // Fall back to the generic message when the error payload is not readable.
  }

  return message
}

export { readAuthServiceErrorMessage }
export type { ReadAuthServiceErrorMessageOptions }
