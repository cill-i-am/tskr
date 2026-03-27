import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "@/styles/app.css?url"

const resolveRuntimeAuthBaseUrl = () => {
  if (typeof document !== "undefined") {
    return document.documentElement.dataset.authBaseUrl
  }

  if (process.env.VITE_AUTH_BASE_URL) {
    return process.env.VITE_AUTH_BASE_URL
  }

  const railwayServiceAuthUrl = process.env.RAILWAY_SERVICE_AUTH_URL

  return railwayServiceAuthUrl ? `https://${railwayServiceAuthUrl}` : undefined
}

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
        title: "TanStack Start Starter",
      },
    ],
  }),
  shellComponent: RootDocument,
})
