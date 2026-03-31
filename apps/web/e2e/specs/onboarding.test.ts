/* oxlint-disable import/no-relative-parent-imports */

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { AppShellPage } from "../pages/workspaces/app-shell-page"
import { OnboardingPage } from "../pages/workspaces/onboarding-page"

test("creates the first workspace after login and enters the app shell", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const onboardingPage = new OnboardingPage(page)
  const appShellPage = new AppShellPage(page)
  const user = await seed.createUser({
    email: `onboarding-${crypto.randomUUID()}@example.com`,
    name: "First Workspace User",
    verified: true,
  })
  const workspaceName = "Fresh Workspace"

  await loginPage.goto()
  await loginPage.signIn(user.email, user.password)
  await onboardingPage.expectLoaded()
  await onboardingPage.createWorkspace(workspaceName)
  await appShellPage.expectLoaded(workspaceName)
})
