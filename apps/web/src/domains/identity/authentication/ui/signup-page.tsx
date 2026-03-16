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

const SignupPage = () => {
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
      const name = String(formData.get("name") ?? "")
      const email = String(formData.get("email") ?? "")
      const password = String(formData.get("password") ?? "")
      const confirmPassword = String(formData.get("confirmPassword") ?? "")

      if (password !== confirmPassword) {
        setIsSubmitting(false)
        setError("Passwords must match.")
        return
      }

      const result = await authClient.signUp.email({
        email,
        name,
        password,
      })

      if (result.error) {
        setIsSubmitting(false)
        setError(result.error.message ?? "Unable to create your account.")
        return
      }

      const signInResult = await authClient.signIn.email({
        email,
        password,
      })

      setIsSubmitting(false)

      if (signInResult.error) {
        setError(
          signInResult.error.message ?? "Unable to sign in after signup."
        )
        return
      }

      startTransition(() => {
        navigate({
          to: "/",
        })
      })
    }
  )

  return (
    <AuthPageShell
      description="Create a lightweight account now and leave room for richer auth features later without changing the browser-side integration shape."
      kicker="Create Account"
      title="Start with the basics and keep the auth surface clean."
    >
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your information below to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="gap-6 flex flex-col" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <Input
                  autoComplete="name"
                  id="name"
                  name="name"
                  placeholder="Ada Lovelace"
                  required
                  type="text"
                />
              </Field>
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
                  This is the email Better Auth will use for login and password
                  resets.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="password"
                  name="password"
                  required
                  type="password"
                />
                <FieldDescription>Use at least 8 characters.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password
                </FieldLabel>
                <Input
                  autoComplete="new-password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  type="password"
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <Field>
                <Button disabled={isSubmitting || isNavigating} type="submit">
                  {isSubmitting || isNavigating
                    ? "Creating account..."
                    : "Create account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-foreground"
                    to="/login"
                  >
                    Sign in
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

export { SignupPage }
