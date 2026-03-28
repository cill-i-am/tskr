interface ResolveAuthBaseUrlOptions {
  authBaseUrl?: string | undefined
  hostname?: string | undefined
  runtimeAuthBaseUrl?: string | undefined
}

interface ResolveRuntimeAuthBaseUrlOptions {
  authBaseUrl?: string | undefined
  browserAuthBaseUrl?: string | undefined
  serverAuthBaseUrl?: string | undefined
  runtimeAuthBaseUrl?: string | undefined
  railwayServiceAuthUrl?: string | undefined
}

const resolveRuntimeAuthBaseUrl = ({
  authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL,
  browserAuthBaseUrl = typeof document === "undefined"
    ? undefined
    : document.documentElement.dataset.authBaseUrl,
  railwayServiceAuthUrl = typeof process === "undefined"
    ? undefined
    : process.env.RAILWAY_SERVICE_AUTH_URL,
  serverAuthBaseUrl = typeof process === "undefined"
    ? undefined
    : process.env.VITE_AUTH_BASE_URL,
  runtimeAuthBaseUrl,
}: ResolveRuntimeAuthBaseUrlOptions = {}) => {
  if (runtimeAuthBaseUrl) {
    return runtimeAuthBaseUrl
  }

  if (browserAuthBaseUrl) {
    return browserAuthBaseUrl
  }

  if (serverAuthBaseUrl) {
    return serverAuthBaseUrl
  }

  if (authBaseUrl) {
    return authBaseUrl
  }

  if (railwayServiceAuthUrl) {
    return `https://${railwayServiceAuthUrl}`
  }
}

interface FetchAuthServiceOptions extends ResolveAuthBaseUrlOptions {
  init?: RequestInit | undefined
  headers?: HeadersInit | undefined
  request?: Request | undefined
}

const mergeHeaders = (
  requestHeaders: HeadersInit | undefined,
  headers: HeadersInit | undefined
) => {
  if (!requestHeaders && !headers) {
    return
  }

  const mergedHeaders = new Headers(requestHeaders)

  if (headers) {
    for (const [key, value] of new Headers(headers)) {
      mergedHeaders.set(key, value)
    }
  }

  return mergedHeaders
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
  { headers, init = {}, request, ...options }: FetchAuthServiceOptions = {}
) =>
  fetch(new URL(path, resolveAuthBaseUrl(options)).toString(), {
    ...init,
    credentials: "include",
    headers: mergeHeaders(request?.headers, headers ?? init.headers),
  })

export { fetchAuthService, resolveAuthBaseUrl, resolveRuntimeAuthBaseUrl }
export type {
  FetchAuthServiceOptions,
  ResolveAuthBaseUrlOptions,
  ResolveRuntimeAuthBaseUrlOptions,
}
