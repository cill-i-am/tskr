import type { SettingsAdminSnapshot } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { AccountProfileForm } from "./account-profile-form"

interface AccountSettingsPageProps {
  snapshot: SettingsAdminSnapshot | null
}

const AccountSettingsPage = ({ snapshot }: AccountSettingsPageProps) => {
  const { activeWorkspace } = useWorkspaceBootstrap()

  return (
    <Card className="bg-background/95">
      <CardHeader>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Your settings
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Account settings
        </h2>
        <CardDescription>
          Manage how you appear in {activeWorkspace?.name ?? "your workspace"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4 flex flex-col">
        {snapshot ? (
          <>
            <p className="text-sm text-muted-foreground">
              Signed in as {snapshot.accountProfile.email}.
            </p>
            <AccountProfileForm
              key={`${snapshot.accountProfile.name}|${snapshot.accountProfile.image ?? ""}`}
              accountProfile={snapshot.accountProfile}
            />
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This route stays available for any authenticated member with an
              active workspace session.
            </p>
            <p className="text-sm text-muted-foreground">
              Workspace-admin settings remain hidden until your role allows
              them.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export { AccountSettingsPage }
