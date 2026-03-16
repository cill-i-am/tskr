import { escapeHtml } from './shared.ts';
import type { EmailTemplateContent } from './shared.ts';

interface PasswordResetTemplateInput {
  appName: string
  resetUrl: string
}

const createPasswordResetTemplate = ({
  appName,
  resetUrl,
}: PasswordResetTemplateInput): EmailTemplateContent => {
  const safeAppName = escapeHtml(appName)
  const safeUrl = escapeHtml(resetUrl)

  return {
    html: [
      "<p>We received a request to reset your password.</p>",
      `<p><a href="${safeUrl}">Reset password</a></p>`,
      `<p>If you did not request this, you can ignore this email. This link is for your ${safeAppName} account.</p>`,
    ].join(""),
    subject: `Reset your ${appName} password`,
    text: [
      "We received a request to reset your password.",
      `Reset password: ${resetUrl}`,
      `If you did not request this, you can ignore this email. This link is for your ${appName} account.`,
    ].join("\n\n"),
  }
}

export { createPasswordResetTemplate }
export type { PasswordResetTemplateInput }
