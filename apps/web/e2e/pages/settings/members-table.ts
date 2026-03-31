import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

class MembersTable {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  private row(name: string): Locator {
    return this.page.locator("tr").filter({
      hasText: name,
    })
  }

  async changeRole(name: string, roleLabel: string) {
    const row = this.row(name)

    await row.getByLabel(`Role for ${name}`).selectOption({
      label: roleLabel,
    })
    const removeMemberButton = row.getByRole("button", {
      name: `Remove ${name}`,
    })
    const saveRoleButton = row.getByRole("button", {
      name: `Save role for ${name}`,
    })

    await saveRoleButton.click()
    await expect(removeMemberButton).toBeEnabled({
      timeout: 10_000,
    })
    await expect(saveRoleButton).toBeDisabled({
      timeout: 10_000,
    })
  }

  async removeMember(name: string) {
    await this.row(name)
      .getByRole("button", { name: `Remove ${name}` })
      .click()
  }

  async expectMissing(name: string) {
    await expect(this.row(name)).toHaveCount(0)
  }
}

export { MembersTable }
