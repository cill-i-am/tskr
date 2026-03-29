import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useRouter } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { InviteMemberForm } from "./invite-member-form"
import { WorkspaceInvitesTable } from "./workspace-invites-table"
import { WorkspaceMembersTable } from "./workspace-members-table"

interface PeopleSettingsPageProps {
  snapshot: SettingsAdminSnapshot
}

const PeopleSettingsPage = ({ snapshot }: PeopleSettingsPageProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const clearError = useEffectEvent(() => {
    setError(null)
  })
  const refreshSnapshot = useEffectEvent(async () => {
    await router.invalidate({ sync: true })
  })

  return (
    <div className="gap-4 flex flex-col">
      <Card className="bg-background/95">
        <CardHeader>
          <h2 className="text-2xl font-semibold tracking-tight">
            People settings
          </h2>
          <CardDescription>
            Manage {snapshot.members.length} workspace members and{" "}
            {snapshot.pendingInvites.length} pending invites.
          </CardDescription>
          <p className="sr-only">
            People management forms will mount here in the next task.
          </p>
        </CardHeader>
      </Card>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] grid">
        <Card className="bg-background/95">
          <CardHeader>
            <h3 className="text-lg font-semibold tracking-tight">
              Invite members
            </h3>
            <CardDescription>
              Send workspace invitations for the roles allowed by your current
              permissions snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm
              canInviteRoles={snapshot.permissions.canInviteRoles}
              onClearError={clearError}
              onError={setError}
              onRefresh={refreshSnapshot}
              workspaceId={snapshot.workspaceProfile.id}
            />
          </CardContent>
        </Card>
        <Card className="bg-background/95">
          <CardHeader>
            <h3 className="text-lg font-semibold tracking-tight">
              Workspace members
            </h3>
            <CardDescription>
              Role changes and removals are rendered exactly from the member
              permissions supplied by the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceMembersTable
              members={snapshot.members}
              onClearError={clearError}
              onError={setError}
              onRefresh={refreshSnapshot}
              workspaceId={snapshot.workspaceProfile.id}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="bg-background/95">
        <CardHeader>
          <h3 className="text-lg font-semibold tracking-tight">
            Pending invites
          </h3>
          <CardDescription>
            Resend and revoke actions are shown only when the invite row
            explicitly allows them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceInvitesTable
            invites={snapshot.pendingInvites}
            onClearError={clearError}
            onError={setError}
            onRefresh={refreshSnapshot}
            workspaceId={snapshot.workspaceProfile.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export { PeopleSettingsPage }
