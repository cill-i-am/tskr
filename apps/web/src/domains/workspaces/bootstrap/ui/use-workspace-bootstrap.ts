import { useContext } from "react"

import { WorkspaceBootstrapContext } from "./workspace-bootstrap-provider"

const useWorkspaceBootstrap = () => {
  const workspaceBootstrap = useContext(WorkspaceBootstrapContext)

  if (!workspaceBootstrap) {
    throw new Error(
      "useWorkspaceBootstrap must be used within a WorkspaceBootstrapProvider."
    )
  }

  return workspaceBootstrap
}

export { useWorkspaceBootstrap }
