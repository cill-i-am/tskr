import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class OnboardingPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", {
        name: "Create your first workspace",
      })
    ).toBeVisible()
  }

  async createWorkspace(name: string) {
    await this.page.getByLabel("Workspace name").fill(name)
    await this.page.getByRole("button", { name: "Create workspace" }).click()
  }
}

export { OnboardingPage }
