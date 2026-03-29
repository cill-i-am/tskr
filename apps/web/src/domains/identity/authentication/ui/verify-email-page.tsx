import { Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FieldDescription } from "@workspace/ui/components/field"

import { AuthPageShell } from "./auth-page-shell"
import { readStoredEmailVerificationFlow } from "./email-verification-flow"
import { VerifyEmailForm } from "./verify-email-form"

interface VerifyEmailPageProps {
  email: string
  reason?: "signin" | ""
}

const VerifyEmailPage = ({ email, reason = "" }: VerifyEmailPageProps) => {
  const [storedFlow, setStoredFlow] =
    useState<ReturnType<typeof readStoredEmailVerificationFlow>>(null)

  useEffect(() => {
    setStoredFlow(readStoredEmailVerificationFlow())
  }, [])

  const hasMatchingStoredFlow = storedFlow?.email === email
  const isSigninFlow =
    reason === "signin" &&
    hasMatchingStoredFlow &&
    storedFlow.reason === "signin"
  const hasStoredFlowForEmail = hasMatchingStoredFlow
  const canResend = isSigninFlow || hasStoredFlowForEmail

  if (!email) {
    return (
      <AuthPageShell
        description="Email verification works only after signup or sign-in gives us an email address to send the code to."
        kicker="Verify Email"
        title="This verification step is missing the email address."
      >
        <Card>
          <CardHeader>
            <CardTitle>Verification link invalid</CardTitle>
            <CardDescription>
              Start from signup or login so we know where to send your code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gap-4 flex flex-col">
              <Button render={<Link to="/signup" />}>Create an account</Button>
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  to="/login"
                >
                  Go back to login
                </Link>
              </FieldDescription>
            </div>
          </CardContent>
        </Card>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell
      description="Enter the verification code from your inbox to finish account setup and let Better Auth create the first web session."
      kicker="Verify Email"
      title="Confirm your email with the one-time code."
    >
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to continue into the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyEmailForm
            canResend={canResend}
            email={email}
            isSigninFlow={isSigninFlow}
          />
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { VerifyEmailPage }
