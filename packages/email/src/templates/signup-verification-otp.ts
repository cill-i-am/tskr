import { escapeHtml } from './shared.ts';
import type { EmailTemplateContent } from './shared.ts';

interface SignupVerificationOtpTemplateInput {
  code: string
}

const createSignupVerificationOtpTemplate = ({
  code,
}: SignupVerificationOtpTemplateInput): EmailTemplateContent => {
  const safeCode = escapeHtml(code)

  return {
    html: [
      "<p>Your one-time sign-up verification code is:</p>",
      `<p style="font-size:32px;font-weight:700;letter-spacing:0.2em;margin:16px 0;"><strong>${safeCode}</strong></p>`,
      "<p>This code expires in 5 minutes.</p>",
      "<p>If you did not request this account, you can ignore this email.</p>",
    ].join(""),
    subject: "Your tskr verification code",
    text: [
      "Your one-time sign-up verification code is:",
      code,
      "This code expires in 5 minutes.",
      "If you did not request this account, you can ignore this email.",
    ].join("\n\n"),
  }
}

export { createSignupVerificationOtpTemplate }
export type { SignupVerificationOtpTemplateInput }
