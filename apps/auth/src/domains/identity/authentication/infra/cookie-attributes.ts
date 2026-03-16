const resolveDefaultCookieAttributes = (betterAuthUrl: string) => ({
  sameSite: betterAuthUrl.startsWith("https://") ? "none" : "lax",
})

export { resolveDefaultCookieAttributes }
