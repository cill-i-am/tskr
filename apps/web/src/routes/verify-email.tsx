import { VerifyEmailPage } from "@/domains/identity/authentication/ui/verify-email-page"
import { createFileRoute, useSearch } from "@tanstack/react-router"

const VerifyEmailRoute = () => {
  const search = useSearch({
    from: "/verify-email",
  })

  return (
    <VerifyEmailPage
      email={search.email}
      reason={search.reason === "signin" ? "signin" : ""}
    />
  )
}

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
    reason: search.reason === "signin" ? "signin" : "",
  }),
})
