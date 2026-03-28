import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

interface BuildWorkspaceInviteAcceptUrlOptions {
  code: string
  secret: string
  webBaseUrl: string
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/u, "")
const workspaceInviteCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const createWorkspaceInviteCode = (length = 8) =>
  Array.from(
    randomBytes(length),
    (value) =>
      workspaceInviteCodeAlphabet[value % workspaceInviteCodeAlphabet.length]
  ).join("")

const encodeInviteCode = (code: string) =>
  Buffer.from(code, "utf8").toString("base64url")

const decodeInviteCode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8")

const signInviteTokenPayload = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest()

const createWorkspaceInviteToken = (code: string, secret: string) => {
  const payload = encodeInviteCode(code)
  const signature = signInviteTokenPayload(payload, secret).toString(
    "base64url"
  )

  return `${payload}.${signature}`
}

const verifyWorkspaceInviteToken = (token: string, secret: string) => {
  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return null
  }

  const expectedSignature = signInviteTokenPayload(payload, secret)
  const providedSignature = Buffer.from(signature, "base64url")

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null
  }

  try {
    return decodeInviteCode(payload)
  } catch {
    return null
  }
}

const buildWorkspaceInviteAcceptUrl = ({
  code,
  secret,
  webBaseUrl,
}: BuildWorkspaceInviteAcceptUrlOptions) => {
  const token = createWorkspaceInviteToken(code, secret)
  const url = new URL("/join-workspace", trimTrailingSlash(webBaseUrl))

  url.searchParams.set("token", token)

  return url.toString()
}

export {
  buildWorkspaceInviteAcceptUrl,
  createWorkspaceInviteCode,
  createWorkspaceInviteToken,
  verifyWorkspaceInviteToken,
}
