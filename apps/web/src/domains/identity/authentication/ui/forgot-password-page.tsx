import { Link } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"
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

const ForgotPasswordPage = () => {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)
      setSuccess(null)
      setIsSubmitting(true)

      const formData = new FormData(event.currentTarget)
      const email = String(formData.get("email") ?? "")
      const redirectTo =
        typeof window === "undefined"
          ? "http://localhost:3000/reset-password"
          : `${window.location.origin}/reset-password`

      const result = await authClient.requestPasswordReset({
        email,
        redirectTo,
      })

      setIsSubmitting(false)

      if (result.error) {
        setError(result.error.message ?? "Unable to request a password reset.")
        return
      }

      setSuccess(
        "If the account exists, the auth service has issued a reset link. In local development the link is logged by the auth service."
      )
    }
  )

  return (
    <AuthPageShell
      description="Keep the first password recovery flow simple: request a reset, let the auth service issue the token, and complete the password change on the web app."
      kicker="Reset Access"
      title="Recover access without pulling auth logic into the web server."
    >
      <Card>
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter the email tied to your account and we&apos;ll start the reset
            flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="gap-6 flex flex-col" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  id="email"
                  name="email"
                  placeholder="m@example.com"
                  required
                  type="email"
                />
                <FieldDescription>
                  We&apos;ll direct the completed reset back to this web app.
                </FieldDescription>
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              {success ? (
                <FieldDescription className="px-3 py-2 rounded-lg border border-border bg-muted/50">
                  {success}
                </FieldDescription>
              ) : null}
              <Field>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Sending reset link..." : "Send reset link"}
                </Button>
                <FieldDescription className="text-center">
                  Remembered it?{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-foreground"
                    to="/login"
                  >
                    Go back to login
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

export { ForgotPasswordPage }
