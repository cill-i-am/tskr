import { useForm, useStore } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useState } from "react"
import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { FieldDescription, FieldGroup } from "@workspace/ui/components/field"
import {
  FormActions,
  FormMessage,
  FormTextField,
} from "@workspace/ui/components/form"

import { authClient } from "./auth-client"
import { forgotPasswordFormSchema } from "./auth-form-schemas"

const ForgotPasswordForm = () => {
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setSuccess(null)

      const redirectTo =
        typeof window === "undefined"
          ? "http://localhost:3000/reset-password"
          : `${window.location.origin}/reset-password`

      const result = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo,
      })

      if (result.error) {
        setError(result.error.message ?? "Unable to request a password reset.")
        return
      }

      setSuccess("If the account exists, check your email for a reset link.")
    },
    validators: {
      onBlur: forgotPasswordFormSchema,
      onSubmit: forgotPasswordFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const isDisabled = !isHydrated || isSubmitting

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

  return (
    <form
      className="gap-6 flex flex-col"
      method="post"
      noValidate
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => (
            <FormTextField
              autoComplete="email"
              description="We'll direct the completed reset back to this web app."
              disabled={isDisabled}
              field={field}
              label="Email"
              placeholder="m@example.com"
              type="email"
            />
          )}
        </form.Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        {success ? (
          <FieldDescription className="px-3 py-2 rounded-lg border border-border bg-muted/50">
            {success}
          </FieldDescription>
        ) : null}
        <FormActions>
          <Button disabled={isDisabled} type="submit">
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
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { ForgotPasswordForm }
