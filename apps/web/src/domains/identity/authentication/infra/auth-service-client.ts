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

const fetchAuthService = (
  path: string,
  init: RequestInit = {},
  options?: ResolveAuthBaseUrlOptions
) =>
  fetch(new URL(path, resolveAuthBaseUrl(options)).toString(), {
    ...init,
    credentials: "include",
  })

export { fetchAuthService, resolveAuthBaseUrl }
export type { ResolveAuthBaseUrlOptions }
