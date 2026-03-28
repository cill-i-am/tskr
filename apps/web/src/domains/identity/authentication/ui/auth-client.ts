import { resolveAuthBaseUrl } from "@/domains/identity/authentication/infra/auth-service-client"
import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [emailOTPClient()],
})

export { authClient }
export { resolveAuthBaseUrl }
