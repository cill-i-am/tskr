import {
  buildJoinWorkspaceTargetPath,
  readPendingWorkspaceInviteFlow,
} from "@/domains/workspaces/join-workspace/ui/workspace-invite-flow"
import { useForm, useStore } from "@tanstack/react-form"
import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useEffectEvent, useState, useTransition } from "react"
import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  FormActions,
  FormMessage,
  FormOtpField,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"

import { authClient } from "./auth-client"
import { verifyEmailFormSchema } from "./auth-form-schemas"
import { clearEmailVerificationFlow } from "./email-verification-flow"

interface VerifyEmailFormProps {
  canResend: boolean
  email: string
  isSigninFlow: boolean
}

const getVerificationErrorMessage = (
  error: {
    code?: string | undefined
    message?: string | undefined
  } | null
) => {
  switch (error?.code) {
    case "INVALID_OTP": {
      return "That code is not valid. Check it and try again."
    }
    case "OTP_EXPIRED": {
      return "That code expired. Request a new one and try again."
    }
    case "TOO_MANY_ATTEMPTS": {
      return "That code is locked. Request a new one to keep going."
    }
    default: {
      return error?.message ?? "Unable to verify that code."
    }
  }
}

const VerifyEmailForm = ({
  canResend,
  email,
  isSigninFlow,
}: VerifyEmailFormProps) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [isNavigating, startTransition] = useTransition()
  const [hasVerifyError, setHasVerifyError] = useState(false)
  const form = useForm({
    defaultValues: {
      otp: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setNotice(null)
      setHasVerifyError(false)

      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: value.otp,
      })

      if (result.error) {
        setHasVerifyError(true)
        setError(getVerificationErrorMessage(result.error))
        return
      }

      const pendingInviteFlow = readPendingWorkspaceInviteFlow()

      clearEmailVerificationFlow()

      startTransition(() => {
        navigate({
          to: pendingInviteFlow ? buildJoinWorkspaceTargetPath() : "/",
        })
      })
    },
    validators: {
      onBlur: verifyEmailFormSchema,
      onSubmit: verifyEmailFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const isSubmitDisabled = !isHydrated || isSubmitting || isNavigating

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )
  const handleOtpChangeEffect = useEffectEvent(() => {
    if (hasVerifyError) {
      setHasVerifyError(false)
    }
  })
  const clearOtpValidationState = useEffectEvent(() => {
    form.setFieldMeta("otp", (previous) => ({
      ...previous,
      errorMap: {},
      errorSourceMap: {},
      errors: [],
      isBlurred: false,
      isTouched: false,
      isValid: true,
    }))
    setHasVerifyError(false)
  })
  const handleResend = useEffectEvent(async () => {
    setError(null)
    setNotice(null)
    setIsResending(true)

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    })

    setIsResending(false)

    if (result.error) {
      setError(
        result.error.message ?? "Unable to send a new verification code."
      )
      return
    }

    clearOtpValidationState()
    setNotice("A new verification code is on the way.")
  })

  return (
    <form
      className="gap-6 flex flex-col"
      method="post"
      noValidate
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            disabled={!isHydrated}
            id="email"
            readOnly
            type="email"
            value={email}
          />
        </Field>
        <form.Field name="otp">
          {(field) => (
            <FormOtpField
              description="Codes expire after 5 minutes."
              disabled={!isHydrated}
              field={field}
              inputMode="numeric"
              invalid={hasVerifyError}
              label="Verification code"
              onChangeEffect={handleOtpChangeEffect}
            />
          )}
        </form.Field>
        {isSigninFlow ? (
          <FieldDescription className="text-center">
            We sent a fresh verification code after your sign-in attempt.
          </FieldDescription>
        ) : null}
        {notice ? (
          <FieldDescription className="text-center">{notice}</FieldDescription>
        ) : null}
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FormActions>
          <Button disabled={isSubmitDisabled} type="submit">
            {isSubmitting || isNavigating ? "Verifying..." : "Verify email"}
          </Button>
          {canResend ? (
            <Button
              disabled={!isHydrated || isResending}
              onClick={handleResend}
              type="button"
              variant="outline"
            >
              {isResending ? "Sending..." : "Send a new code"}
            </Button>
          ) : null}
          <FieldDescription className="text-center">
            Need a different address?{" "}
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              to="/signup"
            >
              Start over
            </Link>
          </FieldDescription>
        </FormActions>
      </FieldGroup>
    </form>
  )
}

export { VerifyEmailForm }
