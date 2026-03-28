import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"

type WorkspaceEntryState = "enter_app" | "needs_auth" | "needs_onboarding"

type WorkspaceEntryResolution =
  | {
      state: "needs_auth"
    }
  | {
      bootstrap: WorkspaceBootstrap
      state: "enter_app" | "needs_onboarding"
    }

const resolveWorkspaceEntry = (
  bootstrap: WorkspaceBootstrap | null
): WorkspaceEntryResolution => {
  if (!bootstrap) {
    return {
      state: "needs_auth",
    }
  }

  if (
    !bootstrap.activeWorkspace ||
    bootstrap.recoveryState === "onboarding_required" ||
    bootstrap.recoveryState === "selection_required"
  ) {
    return {
      bootstrap,
      state: "needs_onboarding",
    }
  }

  return {
    bootstrap,
    state: "enter_app",
  }
}

export { resolveWorkspaceEntry }
export type { WorkspaceEntryResolution, WorkspaceEntryState }
