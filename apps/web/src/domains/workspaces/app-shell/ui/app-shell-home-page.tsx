import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const AppShellHomePage = () => {
  const { activeWorkspace, memberships, pendingInvites, recoveryState } =
    useWorkspaceBootstrap()

  return (
    <div className="gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] grid">
      <Card className="bg-background/95">
        <CardHeader>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Active workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {activeWorkspace?.name ?? "Workspace access ready"}
          </h1>
          <CardDescription>
            {memberships.length} memberships available
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3 text-sm flex flex-col text-muted-foreground">
          <p>
            This lightweight shell proves the authenticated product surface can
            read shared workspace bootstrap state without calling session hooks
            in each child route.
          </p>
          <p>
            {pendingInvites.length} pending invite
            {pendingInvites.length === 1 ? "" : "s"}
          </p>
          <p>
            {recoveryState === "active_valid"
              ? "Your workspace access is current."
              : "If anything changes, the shell will recover access here before deeper routes load."}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle>What this unlocks next</CardTitle>
          <CardDescription>
            Follow-on routes can consume the active workspace directly from the
            shared bootstrap provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-2 text-sm flex flex-col text-muted-foreground">
          <p>Workspace-aware settings and task surfaces can hang off `/app`.</p>
          <p>
            Onboarding and selection recovery now have a stable holding page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export { AppShellHomePage }
