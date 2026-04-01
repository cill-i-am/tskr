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
      /api:\n(?:.*\n)*? {6}depends_on:\n {6}workspace-deps:\n {8}condition: service_completed_successfully/s.test(
        composeLocal
      ),
      /auth:\n(?:.*\n)*? {6}depends_on:\n {6}workspace-deps:\n {8}condition: service_completed_successfully/s.test(
        composeLocal
      ),
      /web:\n(?:.*\n)*? {6}depends_on:\n {6}workspace-deps:\n {8}condition: service_completed_successfully/s.test(
        composeLocal
      ),
    ]).toStrictEqual([true, true, true])
  })

  it("runs Electric in the local sandbox with repo-owned image wiring", () => {
    const composeLocal = readFileSync(localComposePath, "utf8")

    expect([
      /postgres:\n(?:.*\n)*? {4}command:\n {6}- -c\n {6}- listen_addresses=\*\n {6}- -c\n {6}- wal_level=logical/s.test(
        composeLocal
      ),
      !/electric:\n(?:.*\n)*? {4}image:/s.test(composeLocal),
      /electric:\n(?:.*\n)*? {4}build:\n {6}context: \$\{SANDBOX_REPOSITORY_ROOT\}\/apps\/electric\n {6}dockerfile: Dockerfile/s.test(
        composeLocal
      ),
      /electric:\n(?:.*\n)*? {4}env_file:\n {6}- \$\{SANDBOX_ENV_ELECTRIC_FILE\}/s.test(
        composeLocal
      ),
      /electric:\n(?:.*\n)*? {4}depends_on:\n {6}postgres:\n {8}condition: service_healthy/s.test(
        composeLocal
      ),
      /electric:\n(?:.*\n)*? {4}ports:\n {6}- "127\.0\.0\.1:\$\{SANDBOX_ELECTRIC_PORT\}:3000"/s.test(
        composeLocal
      ),
      composeLocal.includes("- electric-storage:/var/lib/electric/persistent"),
    ]).toStrictEqual([true, true, true, true, true, true, true])
  })
})
