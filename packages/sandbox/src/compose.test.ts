import { buildComposeArgs, SANDBOX_COMPOSE_FILES } from "./compose.js"

describe("compose args", () => {
  it("builds local compose args with the local overlay", () => {
    expect(
      buildComposeArgs({
        envFilePath: "/repo/.sandbox/feature-review-12/local/compose.env",
        mode: "local",
        projectName: "tskr-sandbox-feature-review-12-abcd12",
        repositoryRoot: "/repo",
        subcommand: ["up", "-d"],
      })
    ).toStrictEqual([
      "compose",
      "-f",
      "/repo/infra/sandbox/compose.base.yml",
      "-f",
      "/repo/infra/sandbox/compose.local.yml",
      "--env-file",
      "/repo/.sandbox/feature-review-12/local/compose.env",
      "--project-name",
      "tskr-sandbox-feature-review-12-abcd12",
      "up",
      "-d",
    ])
  })

  it("builds hosted compose args with the hosted overlay", () => {
    expect(
      buildComposeArgs({
        envFilePath: "/repo/.sandbox/feature-review-12/hosted/compose.env",
        mode: "hosted",
        projectName: "tskr-sandbox-feature-review-12-abcd12",
        repositoryRoot: "/repo",
        subcommand: ["config"],
      })
    ).toStrictEqual([
      "compose",
      "-f",
      "/repo/infra/sandbox/compose.base.yml",
      "-f",
      "/repo/infra/sandbox/compose.hosted.yml",
      "--env-file",
      "/repo/.sandbox/feature-review-12/hosted/compose.env",
      "--project-name",
      "tskr-sandbox-feature-review-12-abcd12",
      "config",
    ])
    expect(SANDBOX_COMPOSE_FILES.hosted).toBe(
      "infra/sandbox/compose.hosted.yml"
    )
  })
})
