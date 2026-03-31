import {
  buildHostedSandboxUrls,
  buildLocalSandboxUrls,
  buildSandboxEnvFiles,
  deriveSandboxIdentity,
  deriveSandboxPorts,
} from "./config.js"

describe("sandbox identity", () => {
  it("derives a deterministic slug and compose project name", () => {
    const first = deriveSandboxIdentity("Feature Review 12")
    const second = deriveSandboxIdentity("Feature Review 12")

    expect(first).toStrictEqual(second)
    expect(first.slug).toBe("feature-review-12")
    expect(first.projectName).toMatch(
      /^tskr-sandbox-feature-review-12-[a-f0-9]{6}$/
    )
  })

  it("produces different hashes for different names that normalize similarly", () => {
    const first = deriveSandboxIdentity("Feature Review")
    const second = deriveSandboxIdentity("feature-review")

    expect(first.slug).toBe("feature-review")
    expect(second.slug).toBe("feature-review")
    expect(first.hash).not.toBe(second.hash)
    expect(first.projectName).not.toBe(second.projectName)
  })
})

describe("sandbox ports", () => {
  it("allocates deterministic, non-overlapping ports for a sandbox", () => {
    const ports = deriveSandboxPorts("a9b3c4d5ef00")

    expect(ports.api).toBeGreaterThanOrEqual(41_000)
    expect(ports.postgres).toBeLessThan(45_000)
    expect({
      auth: ports.auth - ports.api,
      ingress: ports.ingress - ports.api,
      postgres: ports.postgres - ports.api,
      web: ports.web - ports.api,
    }).toStrictEqual({
      auth: 1,
      ingress: 4,
      postgres: 3,
      web: 2,
    })
  })
})

describe("sandbox urls", () => {
  it("builds local portless urls for each app", () => {
    expect(buildLocalSandboxUrls("feature-review")).toStrictEqual({
      api: "https://feature-review.api.tskr.localhost",
      auth: "https://feature-review.auth.tskr.localhost",
      web: "https://feature-review.web.tskr.localhost",
    })
  })

  it("builds hosted urls from a sandbox root domain", () => {
    expect(
      buildHostedSandboxUrls({
        domainRoot: "sandboxes.example.com",
        slug: "feature-review",
      })
    ).toStrictEqual({
      api: "https://api.feature-review.sandboxes.example.com",
      auth: "https://auth.feature-review.sandboxes.example.com",
      web: "https://web.feature-review.sandboxes.example.com",
    })
  })
})

describe("sandbox env files", () => {
  it("writes aligned env values for local compose sandboxes", () => {
    const ports = deriveSandboxPorts("a9b3c4d5ef00")
    const identity = deriveSandboxIdentity("Feature Review 12")
    const envFiles = buildSandboxEnvFiles({
      emailFrom: "TSKR <noreply@localhost>",
      hostedDomainRoot: "sandboxes.example.com",
      identity,
      mode: "local",
      ports,
      postgresPassword: "postgres",
      postgresUser: "postgres",
      repositoryRoot: "/repo",
    })

    expect(
      [
        `POSTGRES_CONTAINER_NAME=${identity.projectName}-postgres`,
        "SANDBOX_NAME=feature-review-12",
        "SANDBOX_ENV_WEB_FILE=/repo/.sandbox/feature-review-12/local/web.env",
        "SANDBOX_WEB_DOMAIN=web.feature-review-12.sandboxes.example.com",
        `SANDBOX_WEB_PORT=${ports.web}`,
        `SANDBOX_POSTGRES_PORT=${ports.postgres}`,
        `SANDBOX_INGRESS_PORT=${ports.ingress}`,
      ].every((entry) => envFiles.compose.includes(entry))
    ).toBeTruthy()
    expect(envFiles.web).toContain(
      "VITE_AUTH_BASE_URL=https://feature-review-12.auth.tskr.localhost"
    )
    expect(envFiles.web).toContain("SERVER_AUTH_BASE_URL=http://auth:3002")
    expect(
      [
        "BETTER_AUTH_TRUSTED_ORIGINS=https://feature-review-12.web.tskr.localhost",
        "WEB_BASE_URL=https://feature-review-12.web.tskr.localhost",
      ].every((entry) => envFiles.auth.includes(entry))
    ).toBeTruthy()
    expect([
      envFiles.postgres.includes(`POSTGRES_HOST_PORT=${ports.postgres}`),
      envFiles.postgres.includes("POSTGRES_CONTAINER_NAME="),
    ]).toStrictEqual([true, false])
  })

  it("writes production env values for hosted sandboxes", () => {
    const ports = deriveSandboxPorts("a9b3c4d5ef00")
    const identity = deriveSandboxIdentity("Feature Review 12")
    const envFiles = buildSandboxEnvFiles({
      emailFrom: "TSKR <noreply@localhost>",
      hostedDomainRoot: "sandboxes.example.com",
      identity,
      mode: "hosted",
      ports,
      postgresPassword: "postgres",
      postgresUser: "postgres",
      repositoryRoot: "/repo",
    })

    expect([
      envFiles.api.includes("NODE_ENV=production"),
      envFiles.auth.includes("NODE_ENV=production"),
      envFiles.web.includes("NODE_ENV=production"),
    ]).toStrictEqual([true, true, true])
  })
})
