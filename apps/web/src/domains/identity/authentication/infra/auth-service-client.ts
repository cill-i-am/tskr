interface ResolveAuthBaseUrlOptions {
  authBaseUrl?: string | undefined
  hostname?: string | undefined
  request?: Request | undefined
  runtimeAuthBaseUrl?: string | undefined
  serverAuthBaseUrl?: string | undefined
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

const START_EVENT_STORAGE_KEY = Symbol.for("tanstack-start:event-storage")

interface StartRequestStore {
  getStore?: () =>
    | {
        h3Event?: {
          req?: Request | undefined
        }
      }
    | undefined
}

const getCurrentStartRequest = (request: Request | undefined) => {
  if (request || typeof window !== "undefined") {
    return request
  }

  const startRequestStore = (
    globalThis as typeof globalThis & {
      [START_EVENT_STORAGE_KEY]?: StartRequestStore | undefined
    }
  )[START_EVENT_STORAGE_KEY]

  return startRequestStore?.getStore?.()?.h3Event?.req ?? request
}

const getForwardedRequestHeaders = (request: Request | undefined) => {
  if (!request) {
    return
  }

  const cookie = request.headers.get("cookie")

  if (!cookie) {
    return
  }

  return new Headers({
    cookie,
  })
}

const mergeHeaders = (...sources: (HeadersInit | undefined)[]) => {
  if (!sources.some(Boolean)) {
    return
  }

  const mergedHeaders = new Headers()

  for (const source of sources) {
    if (!source) {
      continue
    }

    for (const [key, value] of new Headers(source)) {
      mergedHeaders.set(key, value)
    }
  }

  return mergedHeaders
}

const resolveAuthBaseUrl = (options: ResolveAuthBaseUrlOptions = {}) => {
  const requestHostname = options.request
    ? new URL(options.request.url).hostname
    : undefined
  const hostname =
    options.hostname ??
    requestHostname ??
    (typeof window === "undefined" ? undefined : window.location.hostname)
  const runtimeAuthBaseUrl =
    options.runtimeAuthBaseUrl ??
    resolveRuntimeAuthBaseUrl({
      authBaseUrl: options.authBaseUrl,
    })

  if (options.authBaseUrl) {
    return options.authBaseUrl
  }

  if (options.serverAuthBaseUrl) {
    return options.serverAuthBaseUrl
  }

  if (runtimeAuthBaseUrl) {
    return runtimeAuthBaseUrl
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
) => {
  const currentRequest = getCurrentStartRequest(request)

  return fetch(
    new URL(
      path,
      resolveAuthBaseUrl({
        ...options,
        request: currentRequest,
        serverAuthBaseUrl:
          options.serverAuthBaseUrl ??
          (typeof process === "undefined"
            ? undefined
            : process.env.SERVER_AUTH_BASE_URL),
      })
    ).toString(),
    {
      ...init,
      credentials: "include",
      headers: mergeHeaders(
        getForwardedRequestHeaders(currentRequest),
        init.headers,
        headers
      ),
    }
  )
}

export { fetchAuthService, resolveAuthBaseUrl, resolveRuntimeAuthBaseUrl }
export type {
  FetchAuthServiceOptions,
  ResolveAuthBaseUrlOptions,
  ResolveRuntimeAuthBaseUrlOptions,
}
