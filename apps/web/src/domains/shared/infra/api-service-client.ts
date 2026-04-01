interface ResolveApiBaseUrlOptions {
  apiBaseUrl?: string | undefined
  hostname?: string | undefined
  runtimeApiBaseUrl?: string | undefined
  serverApiBaseUrl?: string | undefined
}

interface ResolveRuntimeApiBaseUrlOptions {
  apiBaseUrl?: string | undefined
  browserApiBaseUrl?: string | undefined
  railwayServiceApiUrl?: string | undefined
  runtimeApiBaseUrl?: string | undefined
  serverApiBaseUrl?: string | undefined
  serverPortlessUrl?: string | undefined
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/u, "")

const deriveSiblingPortlessUrl = (
  portlessUrl: string | undefined,
  {
    currentServiceName,
    siblingServiceName,
  }: {
    currentServiceName: string
    siblingServiceName: string
  }
) => {
  if (!portlessUrl) {
    return
  }

  const url = new URL(portlessUrl)
  const currentSuffix = `${currentServiceName}.localhost`

  if (!url.hostname.endsWith(currentSuffix)) {
    return
  }

  url.hostname = `${url.hostname.slice(0, -currentSuffix.length)}${siblingServiceName}.localhost`

  return trimTrailingSlash(url.toString())
}

const resolveSiblingApiPortlessUrl = (portlessUrl: string | undefined) =>
  deriveSiblingPortlessUrl(portlessUrl, {
    currentServiceName: "web.tskr",
    siblingServiceName: "api.tskr",
  }) ??
  deriveSiblingPortlessUrl(portlessUrl, {
    currentServiceName: "e2e-web.tskr",
    siblingServiceName: "e2e-api.tskr",
  })

const resolveRuntimeApiBaseUrl = ({
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL,
  browserApiBaseUrl = typeof document === "undefined"
    ? undefined
    : document.documentElement.dataset.apiBaseUrl,
  railwayServiceApiUrl = typeof process === "undefined"
    ? undefined
    : process.env.RAILWAY_SERVICE_API_URL,
  runtimeApiBaseUrl,
  serverApiBaseUrl = typeof process === "undefined"
    ? undefined
    : process.env.VITE_API_BASE_URL,
  serverPortlessUrl = typeof process === "undefined"
    ? undefined
    : process.env.PORTLESS_URL,
}: ResolveRuntimeApiBaseUrlOptions = {}) => {
  if (runtimeApiBaseUrl) {
    return trimTrailingSlash(runtimeApiBaseUrl)
  }

  if (browserApiBaseUrl) {
    return trimTrailingSlash(browserApiBaseUrl)
  }

  if (serverApiBaseUrl) {
    return trimTrailingSlash(serverApiBaseUrl)
  }

  const siblingApiPortlessUrl = resolveSiblingApiPortlessUrl(serverPortlessUrl)

  if (siblingApiPortlessUrl) {
    return siblingApiPortlessUrl
  }

  if (apiBaseUrl) {
    return trimTrailingSlash(apiBaseUrl)
  }

  if (railwayServiceApiUrl) {
    return `https://${railwayServiceApiUrl}`
  }
}

const resolveApiBaseUrl = ({
  apiBaseUrl,
  hostname = typeof window === "undefined"
    ? undefined
    : window.location.hostname,
  runtimeApiBaseUrl = resolveRuntimeApiBaseUrl(),
  serverApiBaseUrl = typeof process === "undefined"
    ? undefined
    : process.env.SERVER_API_BASE_URL,
}: ResolveApiBaseUrlOptions = {}) => {
  if (apiBaseUrl) {
    return trimTrailingSlash(apiBaseUrl)
  }

  if (runtimeApiBaseUrl) {
    return trimTrailingSlash(runtimeApiBaseUrl)
  }

  if (serverApiBaseUrl) {
    return trimTrailingSlash(serverApiBaseUrl)
  }

  const isDirectLocalhost = hostname === "localhost" || hostname === "127.0.0.1"

  if (isDirectLocalhost) {
    return "http://localhost:3001"
  }

  return "https://api.tskr.localhost"
}

const resolveApiServiceUrl = (
  path: string,
  {
    apiBaseUrl,
  }: {
    apiBaseUrl?: string | undefined
  } = {}
) => new URL(path, resolveApiBaseUrl({ apiBaseUrl })).toString()

const fetchApiService = (
  path: string,
  {
    apiBaseUrl,
    headers,
    init,
  }: {
    apiBaseUrl?: string | undefined
    headers?: HeadersInit | undefined
    init?: RequestInit | undefined
  } = {}
) =>
  fetch(resolveApiServiceUrl(path, { apiBaseUrl }), {
    ...init,
    credentials: "include",
    headers,
  })

export { fetchApiService, resolveApiBaseUrl, resolveApiServiceUrl }
export type { ResolveApiBaseUrlOptions, ResolveRuntimeApiBaseUrlOptions }
export { resolveRuntimeApiBaseUrl }
