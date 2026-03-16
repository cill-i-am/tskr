import { SignupPage } from "@/domains/identity/authentication/ui/signup-page"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/signup")({
  component: SignupPage,
})
