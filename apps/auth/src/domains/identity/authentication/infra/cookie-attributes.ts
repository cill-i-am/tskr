const resolveDefaultCookieAttributes = (
  betterAuthUrl: string
): {
  sameSite: "none" | "lax"
} => ({
  sameSite: betterAuthUrl.startsWith("https://") ? "none" : "lax",
})

export { resolveDefaultCookieAttributes }
