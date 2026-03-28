import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAccessControl } from "better-auth/plugins/access"
import { emailOTP } from "better-auth/plugins/email-otp"
import { organization } from "better-auth/plugins/organization"
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access"

import { authDatabaseSchema } from "@workspace/db"

import { resolveDefaultCookieAttributes } from "./cookie-attributes.js"
import { database, pool } from "./database.js"
import { createAuthenticationEmailService } from "./email-service.js"
import { parseAuthenticationEnv } from "./env.js"
import {
  buildWorkspaceInviteAcceptUrl,
  createWorkspaceInviteCode,
} from "./workspace-invite-token.js"

const authenticationEnv = parseAuthenticationEnv()
const authenticationEmailService =
  createAuthenticationEmailService(authenticationEnv)
const workspaceAccessControl = createAccessControl(defaultStatements)
const workspaceRoles = {
  admin: adminAc,
  dispatcher: workspaceAccessControl.newRole(memberAc.statements),
  field_worker: workspaceAccessControl.newRole(memberAc.statements),
  member: memberAc,
  owner: ownerAc,
}

const logEmailDeliveryFailure = (
  message: string,
  details: Record<string, unknown>
) => {
  console.error(message, details)
}

const runEmailSideEffect = (
  send: () => Promise<unknown>,
  message: string,
  details: Record<string, unknown>
) => {
  queueMicrotask(async () => {
    try {
      await send()
    } catch (error) {
      logEmailDeliveryFailure(message, {
        ...details,
        error,
      })
    }
  })

  return Promise.resolve()
}

const getWorkspaceInvitationCode = async (invitationId: string) => {
  const result = await pool.query<{ code: string }>(
    `SELECT "code" AS code
     FROM "auth"."invitation"
     WHERE "id" = $1`,
    [invitationId]
  )

  const code = result.rows.at(0)?.code

  if (!code) {
    throw new Error("Expected workspace invitation code to exist")
  }

  return code
}

const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: resolveDefaultCookieAttributes(
      authenticationEnv.betterAuthUrl
    ),
  },
  appName: "tskr",
  basePath: "/api/auth",
  baseURL: authenticationEnv.betterAuthUrl,
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: authDatabaseSchema,
  }),
  emailAndPassword: {
    autoSignIn: false,
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: ({ url, user }) =>
      runEmailSideEffect(
        () =>
          authenticationEmailService.sendPasswordResetEmail({
            resetUrl: url,
            to: user.email,
          }),
        "[auth:email] failed to send password reset email",
        {
          recipient: user.email,
          resetUrl: url,
        }
      ),
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignIn: true,
    sendOnSignUp: true,
  },
  plugins: [
    emailOTP({
      allowedAttempts: 3,
      expiresIn: 300,
      otpLength: 6,
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: ({ email, otp, type }) =>
        runEmailSideEffect(
          () =>
            authenticationEmailService.sendSignupVerificationOtpEmail({
              code: otp,
              to: email,
            }),
          "[auth:email] failed to send signup verification otp email",
          {
            otpType: type,
            recipient: email,
          }
        ),
      storeOTP: "hashed",
    }),
    organization({
      ac: workspaceAccessControl,
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      organizationHooks: {
        beforeCreateInvitation: async () =>
          await Promise.resolve({
            data: {
              code: createWorkspaceInviteCode(),
            },
          }),
      },
      requireEmailVerificationOnInvitation: true,
      roles: workspaceRoles,
      schema: {
        invitation: {
          additionalFields: {
            code: {
              required: false,
              type: "string",
            },
          },
        },
      },
      sendInvitationEmail: ({
        email,
        invitation,
        inviter,
        organization: workspaceOrg,
      }) =>
        runEmailSideEffect(
          async () => {
            const code = await getWorkspaceInvitationCode(invitation.id)

            return authenticationEmailService.sendWorkspaceInvitationEmail({
              acceptUrl: buildWorkspaceInviteAcceptUrl({
                code,
                secret: authenticationEnv.betterAuthSecret,
                webBaseUrl: authenticationEnv.webBaseUrl,
              }),
              code,
              invitedByName: inviter.user.name,
              role: invitation.role,
              to: email,
              workspaceName: workspaceOrg.name,
            })
          },
          "[auth:email] failed to send workspace invitation email",
          {
            invitationId: invitation.id,
            recipient: email,
            workspaceId: workspaceOrg.id,
          }
        ),
    }),
  ],
  secret: authenticationEnv.betterAuthSecret,
  trustedOrigins: authenticationEnv.trustedOrigins,
})

export { auth }
export { authenticationEnv }
