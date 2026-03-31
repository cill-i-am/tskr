import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const localComposePath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../infra/sandbox/compose.local.yml"
)

describe("local sandbox compose topology", () => {
  it("bootstraps workspace dependencies before app services start", () => {
    const composeLocal = readFileSync(localComposePath, "utf8")

    expect([
      /api:\n(?:.*\n)*? {4}depends_on:\n      workspace-deps:\n        condition: service_completed_successfully/s.test(
        composeLocal
      ),
      /auth:\n(?:.*\n)*? {4}depends_on:\n      workspace-deps:\n        condition: service_completed_successfully/s.test(
        composeLocal
      ),
      /web:\n(?:.*\n)*? {4}depends_on:\n      workspace-deps:\n        condition: service_completed_successfully/s.test(
        composeLocal
      ),
    ]).toStrictEqual([true, true, true])
  })
})
