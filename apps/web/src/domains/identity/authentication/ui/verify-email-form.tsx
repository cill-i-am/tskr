import { useForm, useStore } from "@tanstack/react-form"
import type { AnyFieldApi } from "@tanstack/react-form"
import { Link, useNavigate } from "@tanstack/react-router"
import { useEffectEvent, useState, useTransition } from "react"
import type { FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"

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

interface VerifyEmailOtpFieldProps {
  field: AnyFieldApi
}

const VerifyEmailOtpField = ({ field }: VerifyEmailOtpFieldProps) => {
  const isInvalid =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
  const handleChange = useEffectEvent((value: string) => {
    field.handleChange(value)
  })

  return (
    <Field data-invalid={isInvalid || undefined}>
      <FieldLabel htmlFor={field.name}>Verification code</FieldLabel>
      <InputOTP
        aria-invalid={isInvalid || undefined}
        containerClassName="justify-center"
        id={field.name}
        inputMode="numeric"
        maxLength={6}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={handleChange}
        value={field.state.value}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription className="text-center">
        Codes expire after 5 minutes.
      </FieldDescription>
      {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
    </Field>
  )
}

const VerifyEmailForm = ({
  canResend,
  email,
  isSigninFlow,
}: VerifyEmailFormProps) => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [isNavigating, startTransition] = useTransition()
  const form = useForm({
    defaultValues: {
      otp: "",
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setNotice(null)

      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: value.otp,
      })

      if (result.error) {
        setError(getVerificationErrorMessage(result.error))
        return
      }

      clearEmailVerificationFlow()

      startTransition(() => {
        navigate({
          to: "/",
        })
      })
    },
    validators: {
      onBlur: verifyEmailFormSchema,
      onSubmit: verifyEmailFormSchema,
    },
  })
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await form.handleSubmit()
    }
  )
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

    setNotice("A new verification code is on the way.")
  })

  return (
    <form className="gap-6 flex flex-col" noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" readOnly type="email" value={email} />
        </Field>
        <form.Field name="otp">
          {(field) => <VerifyEmailOtpField field={field} />}
        </form.Field>
        {isSigninFlow ? (
          <FieldDescription className="text-center">
            We sent a fresh verification code after your sign-in attempt.
          </FieldDescription>
        ) : null}
        {notice ? (
          <FieldDescription className="text-center">{notice}</FieldDescription>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
        <Field>
          <div className="gap-3 flex flex-col">
            <Button disabled={isSubmitting || isNavigating} type="submit">
              {isSubmitting || isNavigating ? "Verifying..." : "Verify email"}
            </Button>
            {canResend ? (
              <Button
                disabled={isResending}
                onClick={handleResend}
                type="button"
                variant="outline"
              >
                {isResending ? "Sending..." : "Send a new code"}
              </Button>
            ) : null}
          </div>
          <FieldDescription className="text-center">
            Need a different address?{" "}
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              to="/signup"
            >
              Start over
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}

export { VerifyEmailForm }
