import { useWorkspaceBootstrap } from "@/domains/workspaces/bootstrap/ui/use-workspace-bootstrap"
import { Link } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const OnboardingGatePage = () => {
  const { activeWorkspace, memberships, recoveryState } =
    useWorkspaceBootstrap()

  return (
    <div className="p-6 md:p-10 flex min-h-svh items-center justify-center">
      <Card className="max-w-2xl w-full bg-background/95">
        <CardHeader>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Workspace onboarding
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Finish setting up your workspace access
          </h1>
          <CardDescription>
            This holding route keeps onboarding and workspace selection out of
            the main app shell until access is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-4 flex flex-col">
          <div className="gap-1 flex flex-col">
            <CardTitle className="text-sm">Recovery state</CardTitle>
            <p className="font-mono text-sm">{recoveryState}</p>
          </div>
          <div className="gap-1 flex flex-col">
            <CardTitle className="text-sm">Workspace snapshot</CardTitle>
            <p className="text-sm text-muted-foreground">
              Active workspace: {activeWorkspace?.name ?? "None selected yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              Memberships discovered: {memberships.length}
            </p>
          </div>
        </CardContent>
        <CardFooter className="gap-3 justify-between">
          <p className="text-sm text-muted-foreground">
            A fuller onboarding flow can replace this page later without
            changing the gate logic.
          </p>
          <Button
            nativeButton={false}
            render={<Link to="/login" />}
            variant="outline"
          >
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { OnboardingGatePage }
