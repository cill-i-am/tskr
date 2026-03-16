import { ResetPasswordPage } from "@/domains/identity/authentication/ui/reset-password-page"
import { createFileRoute, useSearch } from "@tanstack/react-router"

const ResetPasswordRoute = () => {
  const search = useSearch({
    strict: false,
  })
  const token = typeof search.token === "string" ? search.token : ""

  return <ResetPasswordPage token={token} />
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
})
