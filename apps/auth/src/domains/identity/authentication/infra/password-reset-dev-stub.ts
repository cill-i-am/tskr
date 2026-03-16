const logPasswordResetLink = async ({
  email,
  token,
  url,
}: {
  email: string
  token: string
  url: string
}) => {
  await Promise.resolve()
  console.info(
    `[better-auth] password reset for ${email}: ${url} (token: ${token})`
  )
}

export { logPasswordResetLink }
