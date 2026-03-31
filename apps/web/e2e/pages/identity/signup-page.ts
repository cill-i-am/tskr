import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class SignupPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("/signup")
  }

  async expectLoaded() {
    await expect(this.page.getByLabel("Full name")).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Create account" })
    ).toBeVisible({
      timeout: 10_000,
    })
  }

  async signUp({
    email,
    name,
    password,
  }: {
    email: string
    name: string
    password: string
  }) {
    await this.page.getByLabel("Full name").fill(name)
    await this.page.getByLabel("Email").fill(email)
    await this.page.getByLabel("Password", { exact: true }).fill(password)
    await this.page.getByLabel("Confirm password").fill(password)
    await this.page.getByRole("button", { name: "Create account" }).click()
  }
}

export { SignupPage }
