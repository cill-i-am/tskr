import {
  buildJoinWorkspaceTargetPath,
  readPendingWorkspaceInviteFlow,
} from "@/domains/workspaces/join-workspace/ui/workspace-invite-flow"
import { useForm, useStore } from "@tanstack/react-form"
import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useState, useTransition } from "react"
import type { ChangeEvent, FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { FormMessage, FormTextField } from "@workspace/ui/components/form"
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

interface LoginPasswordFieldProps {
  disabled: boolean
  field: {
    handleBlur: () => void
    handleChange: (value: string) => void
    name: string
    state: {
      meta: {
        errors: (
          | {
              message?: string
            }
          | undefined
        )[]
        isTouched: boolean
      }
      value: string
    }
  }
}

const LoginPasswordField = ({ disabled, field }: LoginPasswordFieldProps) => {
  const isInvalid =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const handleChange = useEffectEvent(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.handleChange(event.target.value)
    }
  )

  return (
    <Field data-invalid={isInvalid || undefined}>
      <div className="flex items-center">
        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
        <Link
          className="text-sm ml-auto text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          to="/forgot-password"
        >
          Forgot your password?
        </Link>
      </div>
      <Input
        aria-invalid={isInvalid || undefined}
        autoComplete="current-password"
        disabled={disabled}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        type="password"
        value={field.state.value}
      />
      {isInvalid ? <FormMessage errors={field.state.meta.errors} /> : null}
    </Field>
  )
}

const LoginForm = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
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

      const pendingInviteFlow = readPendingWorkspaceInviteFlow()

      startTransition(() => {
        navigate({
          to: pendingInviteFlow ? buildJoinWorkspaceTargetPath() : "/",
        })
      })
    },
    validators: {
      onBlur: loginFormSchema,
      onSubmit: loginFormSchema,
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
        <form.Field name="email">
          {(field) => (
            <FormTextField
              autoComplete="email"
              disabled={isDisabled}
              field={field}
              label="Email"
              placeholder="m@example.com"
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <LoginPasswordField disabled={isDisabled} field={field} />
          )}
        </form.Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Field>
          <Button disabled={isDisabled} type="submit">
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
