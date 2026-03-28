import { escapeHtml } from "./shared.ts"
import type { EmailTemplateContent } from "./shared.ts"

interface WorkspaceInvitationTemplateInput {
  acceptUrl: string
  appName: string
  code: string
  invitedByName: string
  role: string
  workspaceName: string
}

const createWorkspaceInvitationTemplate = ({
  acceptUrl,
  appName,
  code,
  invitedByName,
  role,
  workspaceName,
}: WorkspaceInvitationTemplateInput): EmailTemplateContent => {
  const safeAcceptUrl = escapeHtml(acceptUrl)
  const safeAppName = escapeHtml(appName)
  const safeCode = escapeHtml(code)
  const safeInvitedByName = escapeHtml(invitedByName)
  const safeRole = escapeHtml(role.replaceAll("_", " "))
  const safeWorkspaceName = escapeHtml(workspaceName)

  return {
    html: [
      `<p>${safeInvitedByName} invited you to join ${safeWorkspaceName} on ${safeAppName} as ${safeRole}.</p>`,
      `<p><a href="${safeAcceptUrl}">Accept workspace invite</a></p>`,
      `<p>Prefer entering it manually? Use this invite code: <strong>${safeCode}</strong></p>`,
    ].join(""),
    subject: `Join ${workspaceName} on ${appName}`,
    text: [
      `${invitedByName} invited you to join ${workspaceName} on ${appName} as ${role.replaceAll("_", " ")}.`,
      `Accept workspace invite: ${acceptUrl}`,
      `Invite code: ${code}`,
    ].join("\n\n"),
  }
}

export { createWorkspaceInvitationTemplate }
export type { WorkspaceInvitationTemplateInput }
