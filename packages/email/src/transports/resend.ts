import type {
  EmailSendResult,
  EmailTransport,
} from "../contracts.ts"

type ResendTransportConfig = {
  apiKey: string
  baseUrl?: string
  fetch?: typeof globalThis.fetch
}

class EmailTransportError extends Error {
  readonly details: unknown
  readonly status: number

  constructor({
    details,
    message,
    status,
  }: {
    details: unknown
    message: string
    status: number
  }) {
    super(message)
    this.name = "EmailTransportError"
    this.details = details
    this.status = status
  }
}

const createResendTransport = (config: ResendTransportConfig): EmailTransport => {
  const fetchImpl = config.fetch ?? globalThis.fetch
  if (!fetchImpl) {
    throw new Error(
      "No fetch implementation available for createResendTransport"
    )
  }

  const baseUrl = (config.baseUrl ?? "https://api.resend.com").replace(
    /\/+$/u,
    ""
  )

  return {
    async send(message): Promise<EmailSendResult> {
      const response = await fetchImpl(`${baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      })

      const responseBody = await parseResponseBody(response)
      if (!response.ok) {
        const errorMessage = resolveErrorMessage(responseBody, response.statusText)
        throw new EmailTransportError({
          details: responseBody,
          message: `Resend request failed (${response.status}): ${errorMessage}`,
          status: response.status,
        })
      }

      return {
        id: resolveResponseId(responseBody),
      }
    },
  }
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  try {
    const raw = await response.text()
    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  } catch {
    return null
  }
}

const resolveResponseId = (body: unknown): string => {
  if (body && typeof body === "object" && "id" in body) {
    const id = body.id
    if (typeof id === "string" && id.length > 0) {
      return id
    }
  }

  return `resend:${Date.now()}`
}

const resolveErrorMessage = (body: unknown, fallback: string): string => {
  if (typeof body === "string" && body.length > 0) {
    return body
  }

  if (body && typeof body === "object") {
    const bodyRecord = body as Record<string, unknown>
    if (typeof bodyRecord.message === "string" && bodyRecord.message.length > 0) {
      return bodyRecord.message
    }

    if (typeof bodyRecord.error === "string" && bodyRecord.error.length > 0) {
      return bodyRecord.error
    }

    const nestedError = bodyRecord.error
    if (nestedError && typeof nestedError === "object") {
      const nestedRecord = nestedError as Record<string, unknown>
      if (
        typeof nestedRecord.message === "string" &&
        nestedRecord.message.length > 0
      ) {
        return nestedRecord.message
      }
    }
  }

  return fallback || "Unknown resend error"
}

export { EmailTransportError, createResendTransport }
export type { ResendTransportConfig }
