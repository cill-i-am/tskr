interface ResolveAuthBaseUrlOptions {
  authBaseUrl?: string | undefined
  hostname?: string | undefined
  runtimeAuthBaseUrl?: string | undefined
}

interface ResolveRuntimeAuthBaseUrlOptions {
  authBaseUrl?: string | undefined
  runtimeAuthBaseUrl?: string | undefined
  railwayServiceAuthUrl?: string | undefined
}

const resolveRuntimeAuthBaseUrl = ({
  authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL,
  railwayServiceAuthUrl = typeof process === "undefined"
    ? undefined
    : process.env.RAILWAY_SERVICE_AUTH_URL,
  runtimeAuthBaseUrl = typeof document === "undefined"
    ? undefined
    : document.documentElement.dataset.authBaseUrl,
}: ResolveRuntimeAuthBaseUrlOptions = {}) => {
  if (runtimeAuthBaseUrl) {
    return runtimeAuthBaseUrl
  }

  if (authBaseUrl) {
    return authBaseUrl
  }

  if (railwayServiceAuthUrl) {
    return `https://${railwayServiceAuthUrl}`
  }

  return
}

const resolveAuthBaseUrl = ({
  authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL,
  hostname = typeof window === "undefined"
    ? undefined
    : window.location.hostname,
  runtimeAuthBaseUrl = resolveRuntimeAuthBaseUrl({ authBaseUrl }),
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

const fetchAuthService = (
  path: string,
  init: RequestInit = {},
  options?: ResolveAuthBaseUrlOptions
) =>
  fetch(new URL(path, resolveAuthBaseUrl(options)).toString(), {
    ...init,
    credentials: "include",
  })

export { fetchAuthService, resolveAuthBaseUrl, resolveRuntimeAuthBaseUrl }
export type { ResolveAuthBaseUrlOptions, ResolveRuntimeAuthBaseUrlOptions }
