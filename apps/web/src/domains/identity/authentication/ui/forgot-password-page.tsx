import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AuthPageShell } from "./auth-page-shell"
import { ForgotPasswordForm } from "./forgot-password-form"

const ForgotPasswordPage = () => (
  <AuthPageShell
    description="Keep the first password recovery flow simple: request a reset, let the auth service issue the token, and complete the password change on the web app."
    kicker="Reset Access"
    title="Recover access without pulling auth logic into the web server."
  >
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter the email tied to your account and we&apos;ll start the reset
          flow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  </AuthPageShell>
)

export { ForgotPasswordPage }
