import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

interface ResolveAuthBaseUrlOptions {
  authBaseUrl?: string | undefined
  hostname?: string | undefined
  runtimeAuthBaseUrl?: string | undefined
}

const resolveAuthBaseUrl = ({
  authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL,
  hostname = typeof window === "undefined"
    ? undefined
    : window.location.hostname,
  runtimeAuthBaseUrl = typeof document === "undefined"
    ? undefined
    : document.documentElement.dataset.authBaseUrl,
}: ResolveAuthBaseUrlOptions = {}) => {
  if (runtimeAuthBaseUrl) {
    return runtimeAuthBaseUrl
  }

  if (authBaseUrl) {
    return authBaseUrl
  }

  const isDirectLocalhost = hostname === "localhost" || hostname === "127.0.0.1"

  if (isDirectLocalhost) {
    return "http://localhost:3002"
  }

  return "https://auth.tskr.localhost:1355"
}

const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [emailOTPClient()],
})

export { authClient }
export { resolveAuthBaseUrl }
