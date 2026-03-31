import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class ForgotPasswordPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("/forgot-password")
  }

  async expectLoaded() {
    await expect(this.page.getByLabel("Email")).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Send reset link" })
    ).toBeVisible({
      timeout: 10_000,
    })
  }

  async requestReset(email: string) {
    await this.page.getByLabel("Email").fill(email)
    await this.page.getByRole("button", { name: "Send reset link" }).click()
  }

  async expectSuccessNotice() {
    await expect(
      this.page.getByText(
        "If the account exists, check your email for a reset link."
      )
    ).toBeVisible()
  }
}

export { ForgotPasswordPage }
