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
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: undefined,
        EMAIL_REPLY_TO: undefined,
        NODE_ENV: "test",
        PORTLESS: "1",
        PORTLESS_URL: undefined,
        RESEND_API_KEY: undefined,
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(parseAuthenticationEnv()).toStrictEqual({
          betterAuthSecret: "dev-secret-dev-secret-dev-secret-dev-secret",
          betterAuthUrl: "https://auth.tskr.localhost",
          e2eEmailCaptureDir: undefined,
          emailFrom: "TSKR <noreply@tskr.app>",
          emailProvider: "console",
          emailReplyTo: undefined,
          resendApiKey: undefined,
          trustedOrigins: [
            "https://web.tskr.localhost",
            "https://web.example.com",
            "http://localhost:3000",
          ],
          webBaseUrl: "https://web.tskr.localhost",
        })
      }
    )
  })

  it("requires an explicit secret in production", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: undefined,
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: "console",
        NODE_ENV: "production",
        PORTLESS: "1",
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(() => parseAuthenticationEnv()).toThrow(
          "BETTER_AUTH_SECRET must be set"
        )
      }
    )
  })

  it("requires an explicit secret for non-local auth urls outside production too", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: undefined,
        BETTER_AUTH_URL: "https://auth.preview.example.com",
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: "console",
        NODE_ENV: "development",
        PORTLESS: "0",
        WEB_BASE_URL: "https://web.preview.example.com",
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
        E2E_EMAIL_CAPTURE_DIR: "/tmp/tskr-e2e-mail",
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: undefined,
        EMAIL_REPLY_TO: undefined,
        NODE_ENV: "test",
        PORTLESS: "0",
        PORTLESS_URL: undefined,
        RESEND_API_KEY: undefined,
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(parseAuthenticationEnv()).toStrictEqual({
          betterAuthSecret: "test-secret",
          betterAuthUrl: "http://localhost:3002",
          e2eEmailCaptureDir: "/tmp/tskr-e2e-mail",
          emailFrom: "TSKR <noreply@tskr.app>",
          emailProvider: "console",
          emailReplyTo: undefined,
          resendApiKey: undefined,
          trustedOrigins: [
            "https://web.tskr.localhost",
            "http://localhost:3002",
            "http://localhost:3000",
            "http://localhost:5173",
          ],
          webBaseUrl: "http://localhost:3000",
        })
      }
    )
  })

  it("defaults to resend in production and requires a resend api key", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: "test-secret",
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: undefined,
        NODE_ENV: "production",
        PORTLESS: "1",
        RESEND_API_KEY: undefined,
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(() => parseAuthenticationEnv()).toThrow(
          "RESEND_API_KEY must be set when EMAIL_PROVIDER is resend"
        )
      }
    )
  })

  it("accepts resend provider config in production", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: "test-secret",
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: undefined,
        EMAIL_REPLY_TO: "support@tskr.app",
        NODE_ENV: "production",
        PORTLESS: "1",
        RESEND_API_KEY: "resend_test_123",
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(parseAuthenticationEnv()).toMatchObject({
          e2eEmailCaptureDir: undefined,
          emailFrom: "TSKR <noreply@tskr.app>",
          emailProvider: "resend",
          emailReplyTo: "support@tskr.app",
          resendApiKey: "resend_test_123",
          webBaseUrl: "https://web.tskr.localhost",
        })
      }
    )
  })

  it("requires EMAIL_FROM", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: "test-secret",
        EMAIL_FROM: undefined,
        EMAIL_PROVIDER: "console",
        NODE_ENV: "test",
        PORTLESS: "1",
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(() => parseAuthenticationEnv()).toThrow("EMAIL_FROM must be set")
      }
    )
  })

  it("uses WEB_BASE_URL when explicitly set", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: "test-secret",
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: "console",
        NODE_ENV: "test",
        PORTLESS: "0",
        PORTLESS_URL: undefined,
        WEB_BASE_URL: "https://app.example.com",
      },
      () => {
        expect(parseAuthenticationEnv().webBaseUrl).toBe(
          "https://app.example.com"
        )
      }
    )
  })

  it("prefers the injected Portless URL and derives the sibling web URL", async () => {
    await withEnvironment(
      {
        BETTER_AUTH_SECRET: "test-secret",
        BETTER_AUTH_TRUSTED_ORIGINS: undefined,
        BETTER_AUTH_URL: undefined,
        EMAIL_FROM: "TSKR <noreply@tskr.app>",
        EMAIL_PROVIDER: "console",
        NODE_ENV: "test",
        PORTLESS: "1",
        PORTLESS_URL: "https://feature-x.e2e-auth.tskr.localhost:1355",
        WEB_BASE_URL: undefined,
      },
      () => {
        expect(parseAuthenticationEnv()).toMatchObject({
          betterAuthUrl: "https://feature-x.e2e-auth.tskr.localhost:1355",
          trustedOrigins: expect.arrayContaining([
            "https://feature-x.e2e-web.tskr.localhost:1355",
          ]),
          webBaseUrl: "https://feature-x.e2e-web.tskr.localhost:1355",
        })
      }
    )
  })
})
