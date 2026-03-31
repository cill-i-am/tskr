/* oxlint-disable import/no-relative-parent-imports, jest/no-conditional-in-test */

import { test } from "../fixtures/test"
import { ForgotPasswordPage } from "../pages/identity/forgot-password-page"
import { LoginPage } from "../pages/identity/login-page"
import { ResetPasswordPage } from "../pages/identity/reset-password-page"
import { AppShellPage } from "../pages/workspaces/app-shell-page"
import { waitForCapturedEmail } from "../support/email-capture"

test("requests a reset, follows the reset link, and signs in with the new password", async ({
  emailCaptureDir,
  page,
  seed,
}) => {
  const forgotPasswordPage = new ForgotPasswordPage(page)
  const resetPasswordPage = new ResetPasswordPage(page)
  const loginPage = new LoginPage(page)
  const appShellPage = new AppShellPage(page)
  const user = await seed.createWorkspaceUser({
    email: `reset-${crypto.randomUUID()}@example.com`,
    name: "Reset Person",
    workspaceName: "Recovery Ops",
  })
  const newPassword = "new-password-1234"

  await forgotPasswordPage.goto()
  await forgotPasswordPage.expectLoaded()
  await forgotPasswordPage.requestReset(user.email)
  await forgotPasswordPage.expectSuccessNotice()

  const resetEmail = await waitForCapturedEmail<{
    resetUrl: string
    to: string
  }>({
    directory: emailCaptureDir,
    predicate: (candidate) =>
      candidate.type === "password-reset" &&
      candidate.payload.to === user.email,
  })

  if (!resetEmail) {
    throw new Error("Missing password reset email capture.")
  }

  await page.goto(resetEmail.payload.resetUrl)
  await resetPasswordPage.expectLoaded()
  await resetPasswordPage.resetPassword(newPassword)
  await loginPage.expectLoaded()
  await loginPage.signIn(user.email, newPassword)
  await appShellPage.expectLoaded(user.workspaceName)
})
