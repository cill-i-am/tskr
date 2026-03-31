import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class JoinWorkspacePage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto("/join-workspace")
  }

  async joinByCode(code: string) {
    await this.page.getByLabel("Invite code").fill(code)
    await this.page.getByRole("button", { name: "Join workspace" }).click()
  }

  async openSignedInvite(acceptUrl: string) {
    await this.page.goto(acceptUrl)
  }

  async acceptSignedInvite() {
    await this.page.getByRole("button", { name: "Join workspace" }).click()
  }

  async expectWrongAccountRecovery() {
    await expect(
      this.page.getByRole("heading", {
        name: "This invite belongs to a different account",
      })
    ).toBeVisible()
    await expect(
      this.page.getByRole("button", { name: "Enter another invite" })
    ).toBeVisible()
  }
}

export { JoinWorkspacePage }
