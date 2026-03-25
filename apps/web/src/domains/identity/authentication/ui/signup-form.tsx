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
import { signupFormSchema } from "./auth-form-schemas"
import { persistEmailVerificationFlow } from "./email-verification-flow"

interface SignupInputFieldProps {
  autoComplete?: string
  description?: ReactNode
  field: AnyFieldApi
  label: string
  placeholder?: string
  type: HTMLInputTypeAttribute
}

const SignupInputField = ({
  autoComplete,
  description,
  field,
  label,
  placeholder,
  type,
}: SignupInputFieldProps) => {
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

const SignupForm = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, startTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)

      const result = await authClient.signUp.email({
        email: value.email,
        name: value.name,
        password: value.password,
      })

      if (result.error) {
        setError(result.error.message ?? "Unable to create your account.")
        return
      }

      persistEmailVerificationFlow({
        email: value.email,
        reason: "",
      })

      startTransition(() => {
        navigate({
          search: {
            email: value.email,
            reason: "",
          },
          to: "/verify-email",
        })
      })
    },
    validators: {
      onBlur: signupFormSchema,
      onSubmit: signupFormSchema,
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
        <form.Field name="name">
          {(field) => (
            <SignupInputField
              autoComplete="name"
              field={field}
              label="Full name"
              placeholder="Ada Lovelace"
              type="text"
            />
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <SignupInputField
              autoComplete="email"
              description="This is the email Better Auth will use for login and password resets."
              field={field}
              label="Email"
              placeholder="m@example.com"
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <SignupInputField
              autoComplete="new-password"
              description="Use at least 8 characters."
              field={field}
              label="Password"
              type="password"
            />
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <SignupInputField
              autoComplete="new-password"
              field={field}
              label="Confirm password"
              type="password"
            />
          )}
        </form.Field>
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
  )
}

export { SignupForm }
