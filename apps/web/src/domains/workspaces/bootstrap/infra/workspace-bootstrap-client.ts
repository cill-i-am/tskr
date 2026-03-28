import { fetchAuthService } from "@/domains/identity/authentication/ui/auth-client"
import { workspaceBootstrapSchema } from '@/domains/workspaces/bootstrap/contracts/workspace-bootstrap';
import type { WorkspaceBootstrap } from '@/domains/workspaces/bootstrap/contracts/workspace-bootstrap';

const getWorkspaceBootstrap = async (): Promise<WorkspaceBootstrap | null> => {
  const response = await fetchAuthService("/api/workspaces/bootstrap")

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      `Auth service request failed with status ${response.status}.`
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new Error("Invalid workspace bootstrap payload.")
  }

  const parsed = workspaceBootstrapSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error("Invalid workspace bootstrap payload.")
  }

  return parsed.data
}

export { getWorkspaceBootstrap }
