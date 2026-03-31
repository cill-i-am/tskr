import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

import { InvitesTable } from "./invites-table"
import { MembersTable } from "./members-table"

class PeopleSettingsPage {
  readonly invites: InvitesTable
  readonly members: MembersTable
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.invites = new InvitesTable(page)
    this.members = new MembersTable(page)
  }

  async goto() {
    await this.page.goto("/app/settings/people")
  }

  async expectLoaded() {
    await expect(this.page.getByLabel("Invite email")).toBeEnabled({
      timeout: 10_000,
    })
    await expect(
      this.page.getByRole("button", { name: "Send invite" })
    ).toBeEnabled({
      timeout: 10_000,
    })
  }

  async inviteMember({
    email,
    roleLabel,
  }: {
    email: string
    roleLabel: string
  }) {
    await this.page.getByLabel("Invite email").fill(email)
    await this.page.getByLabel("Invite role").selectOption({
      label: roleLabel,
    })
    await this.page.getByRole("button", { name: "Send invite" }).click()
    await expect(this.page.getByLabel("Invite email")).toHaveValue("", {
      timeout: 10_000,
    })
  }
}

export { PeopleSettingsPage }
