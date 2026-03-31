import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

class AppShellPage {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async expectLoaded(workspaceName: string) {
    try {
      await expect(
        this.page.getByRole("heading", {
          name: workspaceName,
        })
      ).toBeVisible()
    } catch (error) {
      const bodyText = (await this.page.locator("body").textContent()) ?? ""
      const compactBodyText = bodyText.replaceAll(/\s+/gu, " ").slice(0, 500)

      throw new Error(
        [
          `Expected app shell heading for "${workspaceName}" at ${this.page.url()}.`,
          `Visible page text: ${compactBodyText}`,
          error instanceof Error ? error.message : String(error),
        ].join("\n"),
        { cause: error }
      )
    }
  }
}

export { AppShellPage }
