import type { SettingsAdminAccountProfile } from "@/domains/identity/settings-admin/contracts/settings-admin-contract"
import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { AccountProfileForm } from "./account-profile-form"

interface AccountSettingsPageProps {
  accountProfile: SettingsAdminAccountProfile
}

const AccountSettingsPage = ({ accountProfile }: AccountSettingsPageProps) => {
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
        <AccountProfileForm
          key={`${accountProfile.name}|${accountProfile.image ?? ""}`}
          accountProfile={accountProfile}
        />
      </CardContent>
    </Card>
  )
}

export { AccountSettingsPage }
