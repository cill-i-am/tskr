import { LoginPage } from "@/domains/identity/authentication/ui/login-page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})
