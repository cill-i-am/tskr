import { escapeHtml } from "./shared.ts"
import type { EmailTemplateContent } from "./shared.ts"

interface ExistingUserSignUpNoticeTemplateInput {
  appName: string
  signInUrl: string
  supportEmail?: string
}

const createExistingUserSignUpNoticeTemplate = ({
  appName,
  signInUrl,
  supportEmail,
}: ExistingUserSignUpNoticeTemplateInput): EmailTemplateContent => {
  const safeAppName = escapeHtml(appName)
  const safeSignInUrl = escapeHtml(signInUrl)
  const safeSupportEmail = supportEmail ? escapeHtml(supportEmail) : undefined

  const supportLine = supportEmail
    ? `If this wasn't you, contact support: ${supportEmail}.`
    : "If this wasn't you, you can safely ignore this email."
  const supportHtml = safeSupportEmail
    ? `<p>If this wasn't you, contact support: <a href="mailto:${safeSupportEmail}">${safeSupportEmail}</a>.</p>`
    : "<p>If this wasn't you, you can safely ignore this email.</p>"

  return {
    html: [
      `<p>An account already exists for this email on ${safeAppName}.</p>`,
      `<p><a href="${safeSignInUrl}">Sign in</a></p>`,
      supportHtml,
    ].join(""),
    subject: `Someone tried to sign up with this email on ${appName}`,
    text: [
      `An account already exists for this email on ${appName}.`,
      `Sign in: ${signInUrl}`,
      supportLine,
    ].join("\n\n"),
  }
}

export { createExistingUserSignUpNoticeTemplate }
export type { ExistingUserSignUpNoticeTemplateInput }
