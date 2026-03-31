/* oxlint-disable import/no-relative-parent-imports */

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { VerifyEmailPage } from "../pages/identity/verify-email-page"
import { AppShellPage } from "../pages/workspaces/app-shell-page"

test("logs a verified user into the app shell", async ({ page, seed }) => {
  const loginPage = new LoginPage(page)
  const appShellPage = new AppShellPage(page)
  const user = await seed.createWorkspaceUser({
    email: `verified-${crypto.randomUUID()}@example.com`,
    name: "Grace Hopper",
    workspaceName: "Operations Control",
  })

  await loginPage.goto()
  await loginPage.signIn(user.email, user.password)
  await appShellPage.expectLoaded(user.workspaceName)
})

test("redirects an unverified user into the verify-email flow", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const verifyEmailPage = new VerifyEmailPage(page)
  const user = await seed.createUser({
    email: `unverified-${crypto.randomUUID()}@example.com`,
    name: "Unverified Person",
    verified: false,
  })

  await loginPage.goto()
  await loginPage.signIn(user.email, user.password)
  await verifyEmailPage.expectLoaded(user.email)
  await verifyEmailPage.expectSigninResendNotice()
})
