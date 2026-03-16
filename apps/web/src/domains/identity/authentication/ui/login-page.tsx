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

const LoginPage = () => {
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
      const email = String(formData.get("email") ?? "")
      const password = String(formData.get("password") ?? "")
      const result = await authClient.signIn.email({
        email,
        password,
      })

      setIsSubmitting(false)

      if (result.error) {
        setError(
          result.error.message ?? "Unable to sign in with those credentials."
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
      description="Sign in to manage your tasks from the web app while the auth service handles sessions, credentials, and password recovery."
      kicker="Sign In"
      title="Pick up exactly where you left off."
    >
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email and password to continue.
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
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    className="text-sm ml-auto text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    to="/forgot-password"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  required
                  type="password"
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <Field>
                <Button disabled={isSubmitting || isNavigating} type="submit">
                  {isSubmitting || isNavigating ? "Signing in..." : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link
                    className="underline underline-offset-4 hover:text-foreground"
                    to="/signup"
                  >
                    Sign up
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

export { LoginPage }
