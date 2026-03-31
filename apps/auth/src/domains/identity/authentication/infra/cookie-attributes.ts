const resolveDefaultCookieAttributes = (
  betterAuthUrl: string
): {
  sameSite: "none" | "lax"
} => ({
  sameSite: betterAuthUrl.startsWith("https://") ? "none" : "lax",
})

const resolveCrossSubDomainCookies = (betterAuthUrl: string) => {
  const { hostname } = new URL(betterAuthUrl)

  if (hostname === "tskr.localhost" || hostname.endsWith(".tskr.localhost")) {
    return {
      domain: "tskr.localhost",
      enabled: true,
    }
  }
}

export { resolveCrossSubDomainCookies, resolveDefaultCookieAttributes }
