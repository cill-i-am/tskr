import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

class InvitesTable {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  private row(email: string): Locator {
    return this.page.locator("tr").filter({
      hasText: email,
    })
  }

  async expectInvite(email: string) {
    await expect(this.row(email)).toBeVisible()
  }

  async resendInvite(email: string) {
    await this.row(email)
      .getByRole("button", {
        name: `Resend invite to ${email}`,
      })
      .click()
  }

  async revokeInvite(email: string) {
    await this.row(email)
      .getByRole("button", { name: `Revoke invite for ${email}` })
      .click()
  }

  async expectInviteRemoved(email: string) {
    await expect(this.row(email)).toHaveCount(0)
  }
}

export { InvitesTable }
