import type { EmailSendResult, EmailTransport } from "../contracts.ts"

interface ConsoleTransportConfig {
  logger?: Pick<Console, "info">
}

const createConsoleTransport = (
  config: ConsoleTransportConfig = {}
): EmailTransport => {
  const logger = config.logger ?? console

  return {
    async send(message): Promise<EmailSendResult> {
      logger.info("[email:console] send", {
        from: message.from,
        html: message.html,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        to: message.to,
      })
      return {
        id: `console:${Date.now()}`,
      }
    },
  }
}

export { createConsoleTransport }
export type { ConsoleTransportConfig }
