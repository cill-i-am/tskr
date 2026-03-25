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
import { loginFormSchema } from "./auth-form-schemas"
import { persistEmailVerificationFlow } from "./email-verification-flow"

const isEmailVerificationRequired = (
  error: {
    code?: string | undefined
    message?: string | undefined
    status?: number | undefined
  } | null
) =>
  error?.status === 403 &&
  (error.code === "EMAIL_NOT_VERIFIED" ||
    error.message === "Email not verified")

interface LoginInputFieldProps {
  autoComplete?: string
  field: AnyFieldApi
  label: string
  labelAction?: ReactNode
  placeholder?: string
  type: HTMLInputTypeAttribute
}

const LoginInputField = ({
  autoComplete,
  field,
  label,
  labelAction,
  placeholder,
  type,
}: LoginInputFieldProps) => {
  const isInvalid =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const handleChange = useEffectEvent(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.handleChange(event.target.value)
    }
  )

  return (
    <Field data-invalid={isInvalid || undefined}>
      {labelAction ? (
        <div className="flex items-center">
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : (
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      )}
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
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  )
}

const LoginForm = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, startTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)

      const result = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })

      if (result.error) {
        if (isEmailVerificationRequired(result.error)) {
          persistEmailVerificationFlow({
            email: value.email,
            reason: "signin",
          })

          startTransition(() => {
            navigate({
              search: {
                email: value.email,
                reason: "signin",
              },
              to: "/verify-email",
            })
          })
          return
        }

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
    },
    validators: {
      onBlur: loginFormSchema,
      onSubmit: loginFormSchema,
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
            <LoginInputField
              autoComplete="email"
              field={field}
              label="Email"
              placeholder="m@example.com"
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <LoginInputField
              autoComplete="current-password"
              field={field}
              label="Password"
              labelAction={
                <Link
                  className="text-sm ml-auto text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  to="/forgot-password"
                >
                  Forgot your password?
                </Link>
              }
              type="password"
            />
          )}
        </form.Field>
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
  )
}

export { LoginForm }
