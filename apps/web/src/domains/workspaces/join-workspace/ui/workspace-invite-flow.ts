import { joinWorkspaceInviteFlowStateSchema } from "@/domains/workspaces/join-workspace/contracts/join-workspace-contract"
import type {
  JoinWorkspaceInviteFlowState,
  JoinWorkspaceInviteCodeInput,
  JoinWorkspaceInviteTokenInput,
} from "@/domains/workspaces/join-workspace/contracts/join-workspace-contract"

const WORKSPACE_INVITE_FLOW_STORAGE_KEY = "tskr-workspace-invite-flow"

type WorkspaceInviteFlowInput =
  | JoinWorkspaceInviteCodeInput
  | JoinWorkspaceInviteTokenInput

const readPendingWorkspaceInviteFlow =
  (): JoinWorkspaceInviteFlowState | null => {
    if (typeof window === "undefined") {
      return null
    }

    const rawValue = window.sessionStorage.getItem(
      WORKSPACE_INVITE_FLOW_STORAGE_KEY
    )

    if (!rawValue) {
      return null
    }

    try {
      const parsedValue = JSON.parse(rawValue) as unknown
      const parsed = joinWorkspaceInviteFlowStateSchema.safeParse(parsedValue)

      if (!parsed.success) {
        return null
      }

      return parsed.data
    } catch {
      return null
    }
  }

const persistWorkspaceInviteFlow = (input: WorkspaceInviteFlowInput): void => {
  if (typeof window === "undefined") {
    return
  }

  const parsedInput = joinWorkspaceInviteFlowStateSchema.safeParse(input)

  if (!parsedInput.success) {
    throw new TypeError(
      "Join workspace invite flow must include exactly one invite identifier."
    )
  }

  window.sessionStorage.setItem(
    WORKSPACE_INVITE_FLOW_STORAGE_KEY,
    JSON.stringify(parsedInput.data)
  )
}

const clearWorkspaceInviteFlow = (): void => {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(WORKSPACE_INVITE_FLOW_STORAGE_KEY)
}

const buildJoinWorkspaceTargetPath = () => "/join-workspace"

export {
  buildJoinWorkspaceTargetPath,
  clearWorkspaceInviteFlow,
  persistWorkspaceInviteFlow,
  readPendingWorkspaceInviteFlow,
}
