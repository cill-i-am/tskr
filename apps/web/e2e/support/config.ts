process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0"

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be set for E2E tests.`)
  }

  return value
}

const E2E_DEFAULT_PASSWORD = "password-1234"
const E2E_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-1234"

const e2eConfig = {
  authBaseUrl: requireEnv("E2E_AUTH_BASE_URL"),
  authSecret: E2E_AUTH_SECRET,
  defaultPassword: E2E_DEFAULT_PASSWORD,
  emailCaptureDir: requireEnv("E2E_EMAIL_CAPTURE_DIR"),
  webBaseUrl: requireEnv("E2E_WEB_BASE_URL"),
}

export { E2E_AUTH_SECRET, E2E_DEFAULT_PASSWORD, e2eConfig }
