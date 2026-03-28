import { resolveRuntimeAuthBaseUrl } from "@/domains/identity/authentication/infra/auth-service-client"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "@/styles/app.css?url"

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html data-auth-base-url={resolveRuntimeAuthBaseUrl()} lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRoute({
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "tskr",
      },
    ],
  }),
  shellComponent: RootDocument,
})
