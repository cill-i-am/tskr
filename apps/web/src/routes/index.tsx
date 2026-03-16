import { HomeSessionCard } from "@/domains/identity/authentication/ui/home-session-card"
import { createFileRoute } from "@tanstack/react-router"

const App = () => (
  <div className="p-6 md:p-10 min-h-svh bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_38%),linear-gradient(180deg,color-mix(in_oklch,var(--color-muted)_60%,transparent)_0%,transparent_100%)]">
    <div className="max-w-5xl gap-10 mx-auto flex flex-col">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
          Better Auth foundation
        </p>
        <h1 className="text-4xl leading-tight font-semibold text-balance">
          The web app now talks directly to the dedicated auth service.
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Start with email and password flows, keep auth state in the client,
          and leave the server-side identity work inside the Hono auth app.
        </p>
      </div>
      <HomeSessionCard />
    </div>
  </div>
)

export const Route = createFileRoute("/")({ component: App })
