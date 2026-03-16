import { escapeHtml, type EmailTemplateContent } from "./shared.ts"

type PasswordResetTemplateInput = {
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
    subject: `Reset your ${appName} password`,
    html: [
      "<p>We received a request to reset your password.</p>",
      `<p><a href="${safeUrl}">Reset password</a></p>`,
      `<p>If you did not request this, you can ignore this email. This link is for your ${safeAppName} account.</p>`,
    ].join(""),
    text: [
      "We received a request to reset your password.",
      `Reset password: ${resetUrl}`,
      `If you did not request this, you can ignore this email. This link is for your ${appName} account.`,
    ].join("\n\n"),
  }
}

export { createPasswordResetTemplate }
export type { PasswordResetTemplateInput }
