import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"

const App = () => (
  <div className="p-6 flex min-h-svh">
    <div className="max-w-md min-w-0 gap-4 text-sm leading-loose flex flex-col">
      <div>
        <h1 className="font-medium">Project ready!</h1>
        <p>You may now add components and start building.</p>
        <p>We&apos;ve already added the button component for you.</p>
        <Button className="mt-2">Button</Button>
      </div>
    </div>
  </div>
)

export const Route = createFileRoute("/")({ component: App })
