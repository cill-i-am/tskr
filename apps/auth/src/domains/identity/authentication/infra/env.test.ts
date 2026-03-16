/* eslint-disable jest/valid-title */
import { parseAuthenticationEnv } from "./env.js"

const withEnvironment = async (
  values: Record<string, string | undefined>,
  test: () => Promise<void> | void
) => {
  const originalEnvironment = { ...process.env }
  let nextEnvironment = { ...originalEnvironment }

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      const { [key]: _removed, ...restEnvironment } = nextEnvironment

      nextEnvironment = restEnvironment
      continue
    }

    nextEnvironment[key] = value
  }

  process.env = nextEnvironment

  try {
    await test()
  } finally {
    process.env = originalEnvironment
  }
}

describe(parseAuthenticationEnv, () => {
  it("uses development defaults and merges trusted origins", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: undefined,
        BETTER_AUTH_TRUSTED_ORIGINS:
          "https://web.example.com, http://localhost:3000",
        BETTER_AUTH_URL: undefined,
        NODE_ENV: "test",
        PORTLESS: "1",
      },
      () => {
        expect(parseAuthenticationEnv()).toStrictEqual({
          betterAuthSecret: "dev-secret-dev-secret-dev-secret-dev-secret",
          betterAuthUrl: "https://auth.tskr.localhost:1355",
          trustedOrigins: [
            "https://web.tskr.localhost:1355",
            "https://web.example.com",
            "http://localhost:3000",
          ],
        })
      }
    )
  })

  it("requires an explicit secret in production", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: undefined,
        NODE_ENV: "production",
      },
      () => {
        expect(() => parseAuthenticationEnv()).toThrow(
          "BETTER_AUTH_SECRET must be set"
        )
      }
    )
  })

  it("uses direct localhost defaults when portless is disabled", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: "test-secret",
        BETTER_AUTH_TRUSTED_ORIGINS: undefined,
        BETTER_AUTH_URL: undefined,
        NODE_ENV: "test",
        PORTLESS: "0",
      },
      () => {
        expect(parseAuthenticationEnv()).toStrictEqual({
          betterAuthSecret: "test-secret",
          betterAuthUrl: "http://localhost:3002",
          trustedOrigins: [
            "https://web.tskr.localhost:1355",
            "http://localhost:3002",
            "http://localhost:3000",
            "http://localhost:5173",
          ],
        })
      }
    )
  })
})
