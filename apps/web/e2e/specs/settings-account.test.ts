/* oxlint-disable import/no-relative-parent-imports */

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { AccountSettingsPage } from "../pages/settings/account-settings-page"

test("updates the account profile and keeps the values after reload", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const accountSettingsPage = new AccountSettingsPage(page)
  const user = await seed.createWorkspaceUser({
    email: `account-${crypto.randomUUID()}@example.com`,
    name: "Account User",
    workspaceName: "Account Workspace",
  })
  const nextName = "Updated Account User"
  const imageUrl = "https://cdn.example.com/avatar.png"

  await loginPage.goto()
  await loginPage.signIn(user.email, user.password)
  await accountSettingsPage.goto()
  await accountSettingsPage.expectLoaded()
  await accountSettingsPage.updateProfile({
    imageUrl,
    name: nextName,
  })
  await page.reload()
  await accountSettingsPage.expectValues({
    imageUrl,
    name: nextName,
  })
})
