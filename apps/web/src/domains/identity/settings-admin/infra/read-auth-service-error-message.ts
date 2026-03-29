const readAuthServiceErrorMessage = async (response: Response) => {
  let message = `Auth service request failed with status ${response.status}.`

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
