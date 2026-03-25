import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AuthPageShell } from "./auth-page-shell"
import { LoginForm } from "./login-form"

const LoginPage = () => (
  <AuthPageShell
    description="Sign in to manage your tasks from the web app while the auth service handles sessions, credentials, and password recovery."
    kicker="Sign In"
    title="Pick up exactly where you left off."
  >
    <Card>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email and password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  </AuthPageShell>
)

export { LoginPage }
