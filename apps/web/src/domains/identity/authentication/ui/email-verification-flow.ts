const EMAIL_VERIFICATION_FLOW_STORAGE_KEY = "tskr-email-verification-flow"

type EmailVerificationReason = "signin" | ""

interface EmailVerificationFlowState {
  email: string
  reason: EmailVerificationReason
}

const readStoredEmailVerificationFlow =
  (): EmailVerificationFlowState | null => {
    if (typeof window === "undefined") {
      return null
    }

    const rawValue = window.sessionStorage.getItem(
      EMAIL_VERIFICATION_FLOW_STORAGE_KEY
    )

    if (!rawValue) {
      return null
    }

    try {
      const parsedValue = JSON.parse(
        rawValue
      ) as Partial<EmailVerificationFlowState>

      if (typeof parsedValue.email !== "string") {
        return null
      }

      return {
        email: parsedValue.email,
        reason: parsedValue.reason === "signin" ? "signin" : "",
      }
    } catch {
      return null
    }
  }

const persistEmailVerificationFlow = (
  state: EmailVerificationFlowState
): void => {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(
    EMAIL_VERIFICATION_FLOW_STORAGE_KEY,
    JSON.stringify(state)
  )
}

const clearEmailVerificationFlow = (): void => {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(EMAIL_VERIFICATION_FLOW_STORAGE_KEY)
}

const hasStoredEmailVerificationFlow = (email: string): boolean => {
  const storedFlow = readStoredEmailVerificationFlow()

  return storedFlow?.email === email
}

export {
  clearEmailVerificationFlow,
  hasStoredEmailVerificationFlow,
  persistEmailVerificationFlow,
  readStoredEmailVerificationFlow,
}
export type { EmailVerificationFlowState, EmailVerificationReason }
