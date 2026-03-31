/* oxlint-disable import/no-relative-parent-imports, jest/no-conditional-in-test */

import { test } from "../fixtures/test"
import { SignupPage } from "../pages/identity/signup-page"
import { VerifyEmailPage } from "../pages/identity/verify-email-page"
import { OnboardingPage } from "../pages/workspaces/onboarding-page"
import { e2eConfig } from "../support/config"
import { waitForCapturedEmail } from "../support/email-capture"

test("signs up, verifies the otp code, and lands on onboarding", async ({
  emailCaptureDir,
  page,
}) => {
  const signupPage = new SignupPage(page)
  const verifyEmailPage = new VerifyEmailPage(page)
  const onboardingPage = new OnboardingPage(page)
  const email = `signup-${crypto.randomUUID()}@example.com`

  await signupPage.goto()
  await signupPage.expectLoaded()
  await signupPage.signUp({
    email,
    name: "Ada Lovelace",
    password: e2eConfig.defaultPassword,
  })

  await verifyEmailPage.expectLoaded(email)

  const verificationEmail = await waitForCapturedEmail<{
    code: string
    to: string
  }>({
    directory: emailCaptureDir,
    predicate: (candidate) =>
      candidate.type === "signup-verification-otp" &&
      candidate.payload.to === email,
  })

  if (!verificationEmail) {
    throw new Error("Missing signup verification email capture.")
  }

  await verifyEmailPage.submitCode(verificationEmail.payload.code)
  await onboardingPage.expectLoaded()
})
