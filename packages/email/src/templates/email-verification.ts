import { escapeHtml } from './shared.ts';
import type { EmailTemplateContent } from './shared.ts';

interface EmailVerificationTemplateInput {
  appName: string
  verificationUrl: string
}

const createEmailVerificationTemplate = ({
  appName,
  verificationUrl,
}: EmailVerificationTemplateInput): EmailTemplateContent => {
  const safeAppName = escapeHtml(appName)
  const safeUrl = escapeHtml(verificationUrl)

  return {
    html: [
      "<p>Confirm your email address to continue.</p>",
      `<p><a href="${safeUrl}">Verify email</a></p>`,
      `<p>If you did not create this ${safeAppName} account, you can ignore this email.</p>`,
    ].join(""),
    subject: `Verify your ${appName} email`,
    text: [
      "Confirm your email address to continue.",
      `Verify email: ${verificationUrl}`,
      `If you did not create this ${appName} account, you can ignore this email.`,
    ].join("\n\n"),
  }
}

export { createEmailVerificationTemplate }
export type { EmailVerificationTemplateInput }
