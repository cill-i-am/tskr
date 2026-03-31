import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class WorkspaceSettingsPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("/app/settings/workspace")
  }

  async expectLoaded() {
    await expect(this.page.getByLabel("Workspace name")).toBeEnabled({
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Save workspace profile" })
    ).toBeEnabled({
      timeout: 10_000,
    })
  }

  async updateProfile({ logoUrl, name }: { logoUrl: string; name: string }) {
    await this.page.getByLabel("Workspace name").fill(name)
    await this.page.getByLabel("Logo URL").fill(logoUrl)
    const saveButton = this.page.getByRole("button", {
      name: "Save workspace profile",
    })

    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          /\/api\/workspaces\/[^/]+\/profile$/u.test(
            new URL(response.url()).pathname
          ) &&
          response.ok()
      ),
      saveButton.click(),
    ])
    await expect(saveButton).toBeEnabled({
      timeout: 10_000,
    })
  }

  async expectValues({
    logoUrl,
    name,
    slug,
  }: {
    logoUrl: string
    name: string
    slug: string
  }) {
    await expect(this.page.getByLabel("Workspace name")).toHaveValue(name)
    await expect(this.page.getByLabel("Logo URL")).toHaveValue(logoUrl)
    await expect(this.page.getByLabel("Workspace slug")).toHaveValue(slug)
  }
}

export { WorkspaceSettingsPage }
