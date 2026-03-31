import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class LoginPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("/login")
  }

  async expectLoaded() {
    await expect(this.page.getByLabel("Email")).toBeVisible({
      timeout: 10_000,
    })
    await expect(this.page.getByLabel("Password")).toBeVisible({
      timeout: 10_000,
    })
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email)
    await this.page.getByLabel("Password").fill(password)
    await Promise.all([
      this.page.waitForURL((url) => url.pathname !== "/login"),
      this.page.getByRole("button", { name: "Login" }).click(),
    ])
  }
}

export { LoginPage }
