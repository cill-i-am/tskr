import { readPendingWorkspaceInviteFlow } from "@/domains/workspaces/join-workspace/ui/workspace-invite-flow"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AuthPageShell } from "./auth-page-shell"
import { LoginForm } from "./login-form"

const LoginPage = () => {
  const hasPendingInviteFlow = readPendingWorkspaceInviteFlow() !== null

  return (
    <AuthPageShell
      description={
        hasPendingInviteFlow
          ? "Sign in to continue your workspace invite, then we’ll hand you back to the join flow to finish accepting it."
          : "Sign in to manage your tasks from the web app while the auth service handles sessions, credentials, and password recovery."
      }
      kicker="Sign In"
      title="Pick up exactly where you left off."
    >
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            {hasPendingInviteFlow
              ? "Enter your email and password to continue to your workspace invite."
              : "Enter your email and password to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { LoginPage }
