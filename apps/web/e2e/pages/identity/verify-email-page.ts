import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class VerifyEmailPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(email: string) {
    await expect(this.page.getByLabel("Email")).toHaveValue(email, {
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Verify email" })
    ).toBeVisible({
      timeout: 10_000,
    })
  }

  async submitCode(code: string) {
    await this.page.getByLabel("Verification code").fill(code)
    await this.page.getByRole("button", { name: "Verify email" }).click()
  }

  async expectSigninResendNotice() {
    await expect(
      this.page.getByText(
        "We sent a fresh verification code after your sign-in attempt."
      )
    ).toBeVisible()
  }
}

export { VerifyEmailPage }
