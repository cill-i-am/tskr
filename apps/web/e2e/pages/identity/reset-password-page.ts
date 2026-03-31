import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class ResetPasswordPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded() {
    await expect(
      this.page.getByLabel("New password", { exact: true })
    ).toBeEnabled({
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Reset password" })
    ).toBeEnabled({
      timeout: 10_000,
    })
  }

  async resetPassword(password: string) {
    await this.page.getByLabel("New password", { exact: true }).fill(password)
    await this.page.getByLabel("Confirm new password").fill(password)
    await this.page.getByRole("button", { name: "Reset password" }).click()
  }
}

export { ResetPasswordPage }
