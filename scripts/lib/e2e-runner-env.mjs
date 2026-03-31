import { buildLocalPostgresChildEnv } from "./local-postgres-launcher.mjs"

export const buildE2eSharedEnv = ({
  baseEnv,
  betterAuthSecret = "e2e-secret-e2e-secret-e2e-secret-1234",
  databaseUrl,
  emailCaptureDirectory,
  emailFrom = "TSKR <noreply@localhost>",
  emailProvider = "console",
  tlsRejectUnauthorized = "0",
}) => ({
  ...buildLocalPostgresChildEnv({
    baseEnv,
    databaseUrl,
  }),
  BETTER_AUTH_SECRET: baseEnv.BETTER_AUTH_SECRET ?? betterAuthSecret,
  E2E_EMAIL_CAPTURE_DIR: emailCaptureDirectory,
  EMAIL_FROM: baseEnv.EMAIL_FROM ?? emailFrom,
  EMAIL_PROVIDER: baseEnv.EMAIL_PROVIDER ?? emailProvider,
  NODE_TLS_REJECT_UNAUTHORIZED:
    baseEnv.NODE_TLS_REJECT_UNAUTHORIZED ?? tlsRejectUnauthorized,
})
