import { ForgotPasswordPage } from "@/domains/identity/authentication/ui/forgot-password-page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})
