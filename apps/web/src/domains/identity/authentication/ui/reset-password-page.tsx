import { Link, useNavigate } from "@tanstack/react-router"
import { useEffectEvent, useState, useTransition } from "react"
import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { authClient } from "./auth-client"
import { AuthPageShell } from "./auth-page-shell"

interface ResetPasswordPageProps {
  token: string
}

const ResetPasswordPage = ({ token }: ResetPasswordPageProps) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNavigating, startTransition] = useTransition()
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)
      setIsSubmitting(true)

      const formData = new FormData(event.currentTarget)
      const newPassword = String(formData.get("newPassword") ?? "")
      const confirmPassword = String(formData.get("confirmPassword") ?? "")

      if (newPassword !== confirmPassword) {
        setIsSubmitting(false)
        setError("Passwords must match.")
        return
      }

      const result = await authClient.resetPassword({
        newPassword,
        token,
      })

      setIsSubmitting(false)

      if (result.error) {
        setError(result.error.message ?? "Unable to reset your password.")
        return
      }

      startTransition(() => {
        navigate({
          to: "/login",
        })
      })
    }
  )

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
          <form className="gap-6 flex flex-col" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="newPassword"
                  name="newPassword"
                  required
                  type="password"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  type="password"
                />
                <FieldDescription>
                  After reset, use this password on the login page.
                </FieldDescription>
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <Field>
                <Button disabled={isSubmitting || isNavigating} type="submit">
                  {isSubmitting || isNavigating
                    ? "Resetting password..."
                    : "Reset password"}
                </Button>
                <FieldDescription className="text-center">
                  Need a fresh link?{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-foreground"
                    to="/forgot-password"
                  >
                    Request another reset
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { ResetPasswordPage }
