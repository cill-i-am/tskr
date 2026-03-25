import { useForm, useStore } from "@tanstack/react-form"
import type { AnyFieldApi } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"
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
import { forgotPasswordFormSchema } from "./auth-form-schemas"

interface ForgotPasswordInputFieldProps {
  autoComplete?: string
  description?: ReactNode
  field: AnyFieldApi
  label: string
  placeholder?: string
  type: HTMLInputTypeAttribute
}

const ForgotPasswordInputField = ({
  autoComplete,
  description,
  field,
  label,
  placeholder,
  type,
}: ForgotPasswordInputFieldProps) => {
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
        placeholder={placeholder}
        type={type}
        value={field.state.value}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  )
}

const ForgotPasswordForm = () => {
  const [error, setError] = useState<string | null>(null)
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
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )

  return (
    <form className="gap-6 flex flex-col" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <form.Field name="email">
          {(field) => (
            <ForgotPasswordInputField
              autoComplete="email"
              description="We'll direct the completed reset back to this web app."
              field={field}
              label="Email"
              placeholder="m@example.com"
              type="email"
            />
          )}
        </form.Field>
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
  )
}

export { ForgotPasswordForm }
