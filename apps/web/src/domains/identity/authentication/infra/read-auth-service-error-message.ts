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
    const payload = (await response.json()) as {
      message?: string | undefined
    }

    if (payload.message) {
      ;({ message } = payload)
    }
  } catch {
    // Fall back to the generic message when the error payload is not JSON.
  }

  return message
}

export { readAuthServiceErrorMessage }
export type { ReadAuthServiceErrorMessageOptions }
