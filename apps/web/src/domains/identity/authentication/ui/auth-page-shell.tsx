import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

interface AuthPageShellProps {
  children: ReactNode
  description: string
  kicker: string
  title: string
}

const AuthPageShell = ({
  children,
  description,
  kicker,
  title,
}: AuthPageShellProps) => (
  <div className="lg:grid-cols-[1.05fr_0.95fr] grid min-h-svh bg-background">
    <aside className="lg:block relative hidden overflow-hidden">
      <div className="inset-0 absolute bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--color-primary)_24%,transparent),transparent_42%),linear-gradient(135deg,color-mix(in_oklch,var(--color-foreground)_92%,black)_0%,color-mix(in_oklch,var(--color-foreground)_82%,var(--color-primary)_18%)_100%)]" />
      <div className="inset-0 absolute bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklch,var(--color-primary)_16%,transparent)_100%)] opacity-70" />
      <div className="p-10 relative flex h-full flex-col justify-between text-primary-foreground">
        <Link
          className="text-sm font-medium w-fit tracking-[0.18em] uppercase opacity-80"
          to="/"
        >
          tskr
        </Link>
        <div className="max-w-lg space-y-6">
          <p className="text-sm tracking-[0.22em] uppercase opacity-70">
            {kicker}
          </p>
          <h1 className="text-4xl leading-tight font-semibold text-balance">
            {title}
          </h1>
          <p className="max-w-md text-base leading-7 text-primary-foreground/78">
            {description}
          </p>
          <div className="gap-3 pt-6 text-sm grid text-primary-foreground/70">
            <p>
              All authentication requests are handled by the dedicated auth
              service.
            </p>
            <p>
              Password resets stay basic for now and are logged by the auth
              service in local development.
            </p>
          </div>
        </div>
      </div>
    </aside>

    <main className="p-6 md:p-10 flex min-h-svh items-center justify-center">
      <div className="max-w-md w-full">{children}</div>
    </main>
  </div>
)

export { AuthPageShell }
