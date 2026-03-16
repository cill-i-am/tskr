import { Link } from "@tanstack/react-router"
import { useEffectEvent, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { authClient } from "./auth-client"

const HomeSessionCard = () => {
  const { data: session, isPending } = authClient.useSession()
  const [error, setError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = useEffectEvent(async () => {
    setError(null)
    setIsSigningOut(true)

    const result = await authClient.signOut()

    setIsSigningOut(false)

    if (result.error) {
      setError(result.error.message ?? "Unable to sign out right now.")
    }
  })

  return (
    <Card className="backdrop-blur bg-background/90">
      <CardHeader>
        <CardTitle>Authentication status</CardTitle>
        <CardDescription>
          The web app is using the Better Auth React client against the
          dedicated auth service.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4 flex flex-col">
        {isPending ? (
          <p className="text-sm text-muted-foreground">Checking session…</p>
        ) : null}
        {!isPending && session ? (
          <div className="gap-1 flex flex-col">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="text-base font-medium">{session.user.email}</p>
          </div>
        ) : null}
        {!isPending && !session ? (
          <div className="gap-2 flex flex-col">
            <p className="text-sm text-muted-foreground">
              No active session yet. Use the auth routes below to sign up or log
              in.
            </p>
            <div className="gap-3 flex flex-wrap">
              <Button render={<Link to="/login" />}>Login</Button>
              <Button render={<Link to="/signup" />} variant="outline">
                Sign up
              </Button>
            </div>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
      {session ? (
        <CardFooter className="gap-3 justify-between">
          <p className="text-sm text-muted-foreground">
            Password reset stays available from the login page.
          </p>
          <Button
            disabled={isSigningOut}
            onClick={handleSignOut}
            variant="outline"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}

export { HomeSessionCard }
