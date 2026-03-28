import type {
  PendingWorkspaceInvite,
  WorkspaceBootstrap,
  WorkspaceMembership,
  WorkspaceRecoveryState,
} from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { createContext, useMemo } from "react"

interface WorkspaceBootstrapContextValue {
  activeWorkspace: WorkspaceMembership | null
  memberships: WorkspaceMembership[]
  pendingInvites: PendingWorkspaceInvite[]
  recoveryState: WorkspaceRecoveryState
}

interface WorkspaceBootstrapProviderProps {
  bootstrap: WorkspaceBootstrap
  children: React.ReactNode
}

const WorkspaceBootstrapContext =
  createContext<WorkspaceBootstrapContextValue | null>(null)

const WorkspaceBootstrapProvider = ({
  bootstrap,
  children,
}: WorkspaceBootstrapProviderProps) => {
  const value = useMemo(
    () => ({
      activeWorkspace: bootstrap.activeWorkspace,
      memberships: bootstrap.memberships,
      pendingInvites: bootstrap.pendingInvites,
      recoveryState: bootstrap.recoveryState,
    }),
    [
      bootstrap.activeWorkspace,
      bootstrap.memberships,
      bootstrap.pendingInvites,
      bootstrap.recoveryState,
    ]
  )

  return (
    <WorkspaceBootstrapContext.Provider value={value}>
      {children}
    </WorkspaceBootstrapContext.Provider>
  )
}

export { WorkspaceBootstrapContext, WorkspaceBootstrapProvider }
export type { WorkspaceBootstrapContextValue }
