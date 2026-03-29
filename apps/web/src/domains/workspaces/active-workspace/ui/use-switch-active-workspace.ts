"use client"

import { updateActiveWorkspace } from "@/domains/workspaces/active-workspace/infra/update-active-workspace"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import { useEffectEvent, useState } from "react"

interface UseSwitchActiveWorkspaceOptions {
  fallbackErrorMessage: string
  keepLockedOnSuccess?: boolean
  onSuccess?: (
    bootstrap: WorkspaceBootstrap,
    workspaceId: string
  ) => Promise<void> | void
}

const useSwitchActiveWorkspace = ({
  fallbackErrorMessage,
  keepLockedOnSuccess = false,
  onSuccess,
}: UseSwitchActiveWorkspaceOptions) => {
  const [error, setError] = useState<string | null>(null)
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<
    string | null
  >(null)

  const switchWorkspace = useEffectEvent(async (workspaceId: string) => {
    setError(null)
    setSwitchingWorkspaceId(workspaceId)
    let finishedSuccess = false

    try {
      const bootstrap = await updateActiveWorkspace({
        workspaceId,
      })

      await onSuccess?.(bootstrap, workspaceId)
      finishedSuccess = true
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : fallbackErrorMessage
      )
    } finally {
      if (!finishedSuccess || !keepLockedOnSuccess) {
        setSwitchingWorkspaceId(null)
      }
    }
  })

  return {
    error,
    switchWorkspace,
    switchingWorkspaceId,
  }
}

export { useSwitchActiveWorkspace }
