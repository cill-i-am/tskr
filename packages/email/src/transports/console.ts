import type { EmailSendResult, EmailTransport } from "../contracts.ts"

type ConsoleTransportConfig = {
  logger?: Pick<Console, "info">
}

const createConsoleTransport = (
  config: ConsoleTransportConfig = {}
): EmailTransport => {
  const logger = config.logger ?? console

  return {
    async send(message): Promise<EmailSendResult> {
      logger.info("[email:console] send", message)
      return {
        id: `console:${Date.now()}`,
      }
    },
  }
}

export { createConsoleTransport }
export type { ConsoleTransportConfig }
