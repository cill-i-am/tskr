import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AuthPageShell } from "./auth-page-shell"
import { SignupForm } from "./signup-form"

const SignupPage = () => (
  <AuthPageShell
    description="Create your account here, then continue through email verification and into the web app."
    kicker="Create Account"
    title="Start with the basics and keep the auth surface clean."
  >
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  </AuthPageShell>
)

export { SignupPage }
