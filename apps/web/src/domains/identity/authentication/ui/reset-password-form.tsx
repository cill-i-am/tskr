import { useForm, useStore } from "@tanstack/react-form"
import type { AnyFieldApi } from "@tanstack/react-form"
import { Link, useNavigate } from "@tanstack/react-router"
import { useEffectEvent, useState, useTransition } from "react"
import type {
  ChangeEvent,
  FormEvent,
  HTMLInputTypeAttribute,
  ReactNode,
} from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { authClient } from "./auth-client"
import { resetPasswordFormSchema } from "./auth-form-schemas"

interface ResetPasswordFormProps {
  token: string
}

interface ResetPasswordInputFieldProps {
  autoComplete?: string
  description?: ReactNode
  field: AnyFieldApi
  label: string
  type: HTMLInputTypeAttribute
}

const ResetPasswordInputField = ({
  autoComplete,
  description,
  field,
  label,
  type,
}: ResetPasswordInputFieldProps) => {
  const isInvalid =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const handleChange = useEffectEvent(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.handleChange(event.target.value)
    }
  )

  return (
    <Field data-invalid={isInvalid || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        aria-invalid={isInvalid || undefined}
        autoComplete={autoComplete}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        type={type}
        value={field.state.value}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  )
}

const ResetPasswordForm = ({ token }: ResetPasswordFormProps) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
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
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

  return (
    <form className="gap-6 flex flex-col" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <form.Field name="newPassword">
          {(field) => (
            <ResetPasswordInputField
              autoComplete="new-password"
              field={field}
              label="New password"
              type="password"
            />
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <ResetPasswordInputField
              autoComplete="new-password"
              description="After reset, use this password on the login page."
              field={field}
              label="Confirm new password"
              type="password"
            />
          )}
        </form.Field>
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
  )
}

export { ResetPasswordForm }
