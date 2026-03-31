import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class AccountSettingsPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("/app/settings/account")
  }

  async expectLoaded() {
    await expect(this.page.getByLabel("Name")).toBeEnabled({
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Save account profile" })
    ).toBeEnabled({
      timeout: 10_000,
    })
  }

  async updateProfile({ imageUrl, name }: { imageUrl: string; name: string }) {
    await this.page.getByLabel("Name").fill(name)
    await this.page.getByLabel("Avatar image URL").fill(imageUrl)
    const saveButton = this.page.getByRole("button", {
      name: "Save account profile",
    })

    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().includes("/api/account/profile") &&
          response.ok()
      ),
      saveButton.click(),
    ])
    await expect(saveButton).toBeEnabled({
      timeout: 10_000,
    })
  }

  async expectValues({ imageUrl, name }: { imageUrl: string; name: string }) {
    await expect(this.page.getByLabel("Name")).toHaveValue(name)
    await expect(this.page.getByLabel("Avatar image URL")).toHaveValue(imageUrl)
  }
}

export { AccountSettingsPage }
