import { readPendingWorkspaceInviteFlow } from "@/domains/workspaces/join-workspace/ui/workspace-invite-flow"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AuthPageShell } from "./auth-page-shell"
import { SignupForm } from "./signup-form"

const SignupPage = () => {
  const hasPendingInviteFlow = readPendingWorkspaceInviteFlow() !== null

  return (
    <AuthPageShell
      description={
        hasPendingInviteFlow
          ? "Create your account first, verify your email, and then we’ll return you to the pending workspace invite."
          : "Create a lightweight account now and leave room for richer auth features later without changing the browser-side integration shape."
      }
      kicker="Create Account"
      title="Start with the basics and keep the auth surface clean."
    >
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            {hasPendingInviteFlow
              ? "Enter your information below to create your account and continue to your workspace invite."
              : "Enter your information below to create your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { SignupPage }
