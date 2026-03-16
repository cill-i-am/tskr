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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"

import { authClient } from "./auth-client"
import { AuthPageShell } from "./auth-page-shell"

interface VerifyEmailPageProps {
  email: string
  reason?: "signin" | ""
}

const VerifyEmailPage = ({ email, reason = "" }: VerifyEmailPageProps) => {
  const navigate = useNavigate()
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isNavigating, startTransition] = useTransition()

  const handleSubmit = useEffectEvent(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)
      setNotice(null)

      if (otp.length !== 6) {
        setError("Enter the 6-digit verification code.")
        return
      }

      setIsSubmitting(true)

      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })

      setIsSubmitting(false)

      if (result.error) {
        setError(result.error.message ?? "Unable to verify that code.")
        return
      }

      startTransition(() => {
        navigate({
          to: "/",
        })
      })
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

  if (!email) {
    return (
      <AuthPageShell
        description="Email verification works only after signup or sign-in gives us an email address to send the code to."
        kicker="Verify Email"
        title="This verification step is missing the email address."
      >
        <Card>
          <CardHeader>
            <CardTitle>Verification link invalid</CardTitle>
            <CardDescription>
              Start from signup or login so we know where to send your code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="gap-4 flex flex-col">
              <Button render={<Link to="/signup" />}>Create an account</Button>
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <Link
                  className="underline underline-offset-4 hover:text-foreground"
                  to="/login"
                >
                  Go back to login
                </Link>
              </FieldDescription>
            </div>
          </CardContent>
        </Card>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell
      description="Enter the verification code from your inbox to finish account setup and let Better Auth create the first web session."
      kicker="Verify Email"
      title="Confirm your email with the one-time code."
    >
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to continue into the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="gap-6 flex flex-col" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" readOnly type="email" value={email} />
              </Field>
              <Field>
                <FieldLabel htmlFor="otp">Verification code</FieldLabel>
                <InputOTP
                  aria-invalid={Boolean(error)}
                  containerClassName="justify-center"
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  name="otp"
                  onChange={setOtp}
                  value={otp}
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
              </Field>
              {reason === "signin" ? (
                <FieldDescription className="text-center">
                  We sent a fresh verification code after your sign-in attempt.
                </FieldDescription>
              ) : null}
              {notice ? (
                <FieldDescription className="text-center">
                  {notice}
                </FieldDescription>
              ) : null}
              {error ? <FieldError>{error}</FieldError> : null}
              <Field>
                <div className="gap-3 flex flex-col">
                  <Button disabled={isSubmitting || isNavigating} type="submit">
                    {isSubmitting || isNavigating
                      ? "Verifying..."
                      : "Verify email"}
                  </Button>
                  <Button
                    disabled={isResending}
                    onClick={handleResend}
                    type="button"
                    variant="outline"
                  >
                    {isResending ? "Sending..." : "Send a new code"}
                  </Button>
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
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export { VerifyEmailPage }
