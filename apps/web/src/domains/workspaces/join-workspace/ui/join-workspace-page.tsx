import { AuthPageShell } from "@/domains/identity/authentication/ui/auth-page-shell"
import { Link } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FieldDescription } from "@workspace/ui/components/field"

import { JoinWorkspaceForm } from "./join-workspace-form"

interface JoinWorkspacePageProps {
  token?: string
}

type JoinWorkspaceRecoveryState =
  | "already_used"
  | "invalid"
  | "revoked"
  | "wrong_account"

const recoveryCopy: Record<
  JoinWorkspaceRecoveryState,
  {
    cardDescription: string
    cardTitle: string
    description: string
    title: string
  }
> = {
  already_used: {
    cardDescription:
      "If you still need access, ask the workspace admin to issue a new invite.",
    cardTitle: "Invite already used",
    description:
      "This invite has already been accepted, so it cannot be used again.",
    title: "This invite has already been used",
  },
  invalid: {
    cardDescription: "Ask the workspace admin for a fresh invite link or code.",
    cardTitle: "Invite unavailable",
    description:
      "The invite link or code no longer points to a pending workspace invite.",
    title: "This invite is no longer valid",
  },
  revoked: {
    cardDescription:
      "Request a new invite from the workspace admin who sent it.",
    cardTitle: "Invite revoked",
    description:
      "This workspace invite was revoked before it could be accepted.",
    title: "This invite has been revoked",
  },
  wrong_account: {
    cardDescription:
      "Sign in with the email address that received the invite to continue.",
    cardTitle: "Wrong account",
    description:
      "The current session does not match the email address that this invite was sent to.",
    title: "This invite belongs to a different account",
  },
}

const classifyInviteError = (
  message: string
): JoinWorkspaceRecoveryState | null => {
  const normalizedMessage = message.trim().toLowerCase().replaceAll(/\s+/g, " ")

  if (
    normalizedMessage.includes("not the recipient of that invite") ||
    normalizedMessage.includes("invite belongs to a different account")
  ) {
    return "wrong_account"
  }

  if (
    normalizedMessage.includes("already been used") ||
    normalizedMessage.includes("already used")
  ) {
    return "already_used"
  }

  if (normalizedMessage.includes("revoked")) {
    return "revoked"
  }

  if (
    normalizedMessage.includes("invite code or token is required") ||
    normalizedMessage.includes("invite not found") ||
    normalizedMessage.includes("invite is invalid") ||
    normalizedMessage.includes("no longer valid")
  ) {
    return "invalid"
  }

  return null
}

const JoinWorkspaceRecoveryCard = ({
  recoveryState,
}: {
  recoveryState: JoinWorkspaceRecoveryState
}) => {
  const copy = recoveryCopy[recoveryState]

  return (
    <AuthPageShell
      description={copy.description}
      kicker="Join Workspace"
      title={copy.title}
    >
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="gap-4 flex flex-col">
            <Button render={<Link to="/join-workspace" />}>
              Enter another invite
            </Button>
            <FieldDescription className="text-center">
              Need to switch accounts?{" "}
              <Link
                className="underline underline-offset-4 hover:text-foreground"
                to="/login"
              >
                Go to login
              </Link>
            </FieldDescription>
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

const JoinWorkspacePage = ({ token }: JoinWorkspacePageProps) => {
  const [recoveryState, setRecoveryState] =
    useState<JoinWorkspaceRecoveryState | null>(null)
  const hasTokenParam = typeof token === "string"
  const normalizedToken = hasTokenParam ? token.trim() : undefined
  const handleRecoverableError = useEffectEvent((message: string) => {
    const nextRecoveryState = classifyInviteError(message)

    if (!nextRecoveryState) {
      return false
    }

    setRecoveryState(nextRecoveryState)
    return true
  })

  if (recoveryState) {
    return <JoinWorkspaceRecoveryCard recoveryState={recoveryState} />
  }

  if (hasTokenParam && !normalizedToken) {
    return (
      <AuthPageShell
        description="Invite links arrive with a signed token from the auth service. If that token is missing, the link cannot be accepted."
        kicker="Join Workspace"
        title="This invite link is missing its token."
      >
        <Card>
          <CardHeader>
            <CardTitle>Invite link invalid</CardTitle>
            <CardDescription>
              Ask the workspace admin for a fresh invite link, or enter the
              invite code manually instead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gap-4 flex flex-col">
              <Button render={<Link to="/join-workspace" />}>
                Enter an invite code
              </Button>
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  to="/login"
                >
                  Go to login
                </Link>
              </FieldDescription>
            </div>
          </CardContent>
        </Card>
      </AuthPageShell>
    )
  }

  if (normalizedToken) {
    return (
      <AuthPageShell
        description="Signed workspace invites arrive with a token, so you can accept them without typing the short code manually."
        kicker="Join Workspace"
        title="Accept your workspace invite"
      >
        <Card>
          <CardHeader>
            <CardTitle>Join this workspace</CardTitle>
            <CardDescription>
              Continue to accept the invite from the link you opened.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinWorkspaceForm
              mode="token"
              onRecoverableError={handleRecoverableError}
              token={normalizedToken}
            />
          </CardContent>
        </Card>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell
      description="Enter the workspace invite code from your email to join an existing team without mixing this flow into the account-creation pages."
      kicker="Join Workspace"
      title="Join a workspace with an invite code"
    >
      <Card>
        <CardHeader>
          <CardTitle>Enter your workspace invite</CardTitle>
          <CardDescription>
            Use the short code from the invite email if you are not opening the
            signed invite link directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinWorkspaceForm
            mode="code"
            onRecoverableError={handleRecoverableError}
          />
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { JoinWorkspacePage }
