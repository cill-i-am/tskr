import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { Link } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"

import { CreateWorkspaceForm } from "./create-workspace-form"

const SelectionRecoveryFallback = () => {
  const { memberships, pendingInvites } = useWorkspaceBootstrap()

  return (
    <div className="p-6 md:p-10 flex min-h-svh items-center justify-center">
      <Card className="max-w-2xl w-full bg-background/95">
        <CardHeader>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Workspace onboarding
          </p>
          <h1 className="text-3xl font-medium tracking-tight">
            Workspace selection is coming next
          </h1>
          <CardDescription>
            You already belong to at least one workspace, but this slice only
            ships the first create-workspace happy path.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3 text-sm flex flex-col text-muted-foreground">
          <p>{memberships.length} memberships discovered</p>
          <p>
            {pendingInvites.length} pending invite
            {pendingInvites.length === 1 ? "" : "s"} waiting
          </p>
          <p>Workspace recovery selection will land in a follow-up issue.</p>
        </CardContent>
      </Card>
    </div>
  )
}

const CreateWorkspaceOnboarding = () => (
  <div className="p-6 md:p-10 flex min-h-svh items-center justify-center">
    <Card className="max-w-2xl w-full bg-background/95">
      <CardHeader>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Workspace onboarding
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Create your first workspace
        </h1>
        <CardDescription>
          Keep account setup and workspace setup separate, then drop straight
          into the new workspace once it is ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-6 flex flex-col">
        <div className="gap-1 flex flex-col">
          <p className="text-sm font-medium">Start with the workspace name</p>
          <p className="text-sm text-muted-foreground">
            The backend will derive and persist the slug so this first setup
            step stays lightweight.
          </p>
        </div>
        <CreateWorkspaceForm />
        <Button
          className="w-full"
          nativeButton={false}
          render={<Link to="/join-workspace" />}
          variant="outline"
        >
          Join by invite
        </Button>
      </CardContent>
    </Card>
  </div>
)

const WorkspaceOnboardingPage = () => {
  const { recoveryState } = useWorkspaceBootstrap()

  if (recoveryState === "selection_required") {
    return <SelectionRecoveryFallback />
  }

  return <CreateWorkspaceOnboarding />
}

export { WorkspaceOnboardingPage }
