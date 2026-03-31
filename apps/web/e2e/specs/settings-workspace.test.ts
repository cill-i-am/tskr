/* oxlint-disable import/no-relative-parent-imports */

import { test } from "../fixtures/test"
import { LoginPage } from "../pages/identity/login-page"
import { WorkspaceSettingsPage } from "../pages/settings/workspace-settings-page"

test("updates the workspace profile and keeps the slug read-only", async ({
  page,
  seed,
}) => {
  const loginPage = new LoginPage(page)
  const workspaceSettingsPage = new WorkspaceSettingsPage(page)
  const user = await seed.createWorkspaceUser({
    email: `workspace-${crypto.randomUUID()}@example.com`,
    name: "Workspace Owner",
    workspaceName: "Original Workspace",
    workspaceSlug: "original-workspace",
  })
  const nextName = "Updated Workspace"
  const logoUrl = "https://cdn.example.com/logo.png"

  await loginPage.goto()
  await loginPage.signIn(user.email, user.password)
  await workspaceSettingsPage.goto()
  await workspaceSettingsPage.expectLoaded()
  await workspaceSettingsPage.updateProfile({
    logoUrl,
    name: nextName,
  })
  await page.reload()
  await workspaceSettingsPage.expectValues({
    logoUrl,
    name: nextName,
    slug: "original-workspace",
  })
})
