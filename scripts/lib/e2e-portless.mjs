const E2E_PORTLESS_SERVICE_NAMES = {
  auth: "e2e-auth.tskr",
  web: "e2e-web.tskr",
}

const escapeForRegex = (value) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildPortlessServiceUrlPattern = (serviceName) =>
  new RegExp(
    `https?:\\/\\/(?:[a-z0-9-]+\\.)*${escapeForRegex(serviceName)}\\.localhost(?::\\d+)?`,
    "giu"
  )

const resolvePortlessServiceUrl = (output, serviceName) =>
  output.match(buildPortlessServiceUrlPattern(serviceName))?.[0] ?? null

const resolvePortlessServiceUrls = (output) => {
  const webBaseUrl = resolvePortlessServiceUrl(
    output,
    E2E_PORTLESS_SERVICE_NAMES.web
  )
  const authBaseUrl = resolvePortlessServiceUrl(
    output,
    E2E_PORTLESS_SERVICE_NAMES.auth
  )

  if (!webBaseUrl || !authBaseUrl) {
    throw new Error(
      "Unable to resolve the E2E Portless routes. Make sure the e2e web and auth dev servers are running."
    )
  }

  return {
    authBaseUrl,
    webBaseUrl,
  }
}

const assertHttpsPortlessServiceUrls = ({ authBaseUrl, webBaseUrl }) => {
  if (authBaseUrl.startsWith("https://") && webBaseUrl.startsWith("https://")) {
    return
  }

  throw new Error(
    "Portless proxy must run in HTTPS mode for E2E auth flows. Run `portless proxy stop && portless proxy start --https`."
  )
}

export {
  assertHttpsPortlessServiceUrls,
  E2E_PORTLESS_SERVICE_NAMES,
  resolvePortlessServiceUrl,
  resolvePortlessServiceUrls,
}
