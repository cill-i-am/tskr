import { Link } from "@tanstack/react-router"

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
import { ResetPasswordForm } from "./reset-password-form"

interface ResetPasswordPageProps {
  token: string
}

const ResetPasswordPage = ({ token }: ResetPasswordPageProps) => {
  if (!token) {
    return (
      <AuthPageShell
        description="Reset links arrive with a token from the auth service. If the token is missing, ask for a new password reset and try again."
        kicker="Reset Password"
        title="This reset link is missing its token."
      >
        <Card>
          <CardHeader>
            <CardTitle>Reset link invalid</CardTitle>
            <CardDescription>
              Request a new password reset to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gap-4 flex flex-col">
              <Button render={<Link to="/forgot-password" />}>
                Request a new link
              </Button>
              <FieldDescription className="text-center">
                Already signed in?{" "}
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  to="/"
                >
                  Return home
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
      description="Use the token issued by the auth service to replace the credential password without adding any web-server auth logic."
      kicker="Set A New Password"
      title="Finish the reset inside the web client."
    >
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Enter and confirm a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} />
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { ResetPasswordPage }
