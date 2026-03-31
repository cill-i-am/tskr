import { useForm, useStore } from "@tanstack/react-form"
import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useState, useTransition } from "react"
import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { FieldDescription, FieldGroup } from "@workspace/ui/components/field"
import {
  FormActions,
  FormMessage,
  FormTextField,
} from "@workspace/ui/components/form"

import { authClient } from "./auth-client"
import { resetPasswordFormSchema } from "./auth-form-schemas"

interface ResetPasswordFormProps {
  token: string
}

const ResetPasswordForm = ({ token }: ResetPasswordFormProps) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isNavigating, startTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      newPassword: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)

      const result = await authClient.resetPassword({
        newPassword: value.newPassword,
        token,
      })

      if (result.error) {
        setError(result.error.message ?? "Unable to reset your password.")
        return
      }

      startTransition(() => {
        navigate({
          to: "/login",
        })
      })
    },
    validators: {
      onBlur: resetPasswordFormSchema,
      onSubmit: resetPasswordFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const isDisabled = !isHydrated || isSubmitting || isNavigating

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
        <form.Field name="newPassword">
          {(field) => (
            <FormTextField
              autoComplete="new-password"
              disabled={isDisabled}
              field={field}
              label="New password"
              type="password"
            />
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <FormTextField
              autoComplete="new-password"
              description="After reset, use this password on the login page."
              disabled={isDisabled}
              field={field}
              label="Confirm new password"
              type="password"
            />
          )}
        </form.Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FormActions>
          <Button disabled={isDisabled} type="submit">
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
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { ResetPasswordForm }
