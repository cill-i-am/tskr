import { workspaceBootstrapSchema } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import type { WorkspaceBootstrap } from "@/domains/workspaces/bootstrap/contracts/workspace-bootstrap"
import {
  clearCurrentStartRequest,
  setCurrentStartRequest,
  withoutWindow,
} from "@/test-helpers"

import { getWorkspaceBootstrap } from "./workspace-bootstrap-client"

const bootstrapPayload: WorkspaceBootstrap = {
  activeWorkspace: {
    id: "workspace_123",
    logo: null,
    name: "Operations Control",
    role: "owner",
    slug: "operations-control",
  },
  memberships: [
    {
      id: "membership_123",
      logo: null,
      name: "Operations Control",
      role: "owner",
      slug: "operations-control",
    },
  ],
  pendingInvites: [],
  recoveryState: "active_valid",
}

const withAuthServiceFetch = () => {
  const fetchMock = vi.fn()

  vi.stubGlobal("fetch", fetchMock)
  document.documentElement.dataset.authBaseUrl = "https://auth.example.com"

  return fetchMock
}

const withoutAuthServiceFetch = () => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.authBaseUrl
}

describe("workspace bootstrap schema", () => {
  it("accepts the auth bootstrap payload", () => {
    expect(workspaceBootstrapSchema.parse(bootstrapPayload)).toStrictEqual(
      bootstrapPayload
    )
  })
})

describe("workspace bootstrap client", () => {
  it("forwards cookies from the current Start request during server-side bootstrap reads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))
      setCurrentStartRequest(
        new Request("https://web.example.com/app", {
          headers: {
            cookie: "session=from-start-request",
          },
        })
      )

      await expect(
        withoutWindow(() => getWorkspaceBootstrap())
      ).resolves.toStrictEqual(bootstrapPayload)

      const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit

      expect(
        Object.fromEntries(new Headers(callInit.headers).entries())
      ).toStrictEqual({
        cookie: "session=from-start-request",
      })
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })

  it("loads workspace bootstrap from the auth service", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))

      await expect(getWorkspaceBootstrap()).resolves.toStrictEqual(
        bootstrapPayload
      )

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/bootstrap",
        {
          credentials: "include",
        }
      )
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })

  it("preserves request headers when fetching workspace bootstrap", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(Response.json(bootstrapPayload))
      const request = new Request("https://web.example.com", {
        headers: {
          cookie: "session=abc",
        },
      })

      await expect(
        getWorkspaceBootstrap({
          init: {
            headers: {
              "x-request-id": "request-123",
            },
            method: "GET",
          },
          request,
        })
      ).resolves.toStrictEqual(bootstrapPayload)

      const callInit = fetchMock.mock.calls[0]?.[1] as RequestInit

      expect(fetchMock).toHaveBeenCalledWith(
        "https://auth.example.com/api/workspaces/bootstrap",
        expect.objectContaining({
          credentials: "include",
          method: "GET",
        })
      )
      expect(
        Object.fromEntries(new Headers(callInit.headers).entries())
      ).toStrictEqual({
        cookie: "session=abc",
        "x-request-id": "request-123",
      })
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })

  it("returns null for an unauthorized auth response", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("", { status: 401 }))

      await expect(getWorkspaceBootstrap()).resolves.toBeNull()
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })

  it("rejects malformed bootstrap payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(new Response("{", { status: 200 }))

      await expect(getWorkspaceBootstrap()).rejects.toThrow(
        "Malformed workspace bootstrap JSON."
      )
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })

  it("rejects schema-invalid bootstrap payloads", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        Response.json({
          activeWorkspace: null,
          memberships: [],
          pendingInvites: [],
          recoveryState: "not-a-real-state",
        })
      )

      await expect(getWorkspaceBootstrap()).rejects.toThrow(
        "Invalid workspace bootstrap payload."
      )
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })

  it("rejects non-ok auth responses other than 401", async () => {
    const fetchMock = withAuthServiceFetch()

    try {
      fetchMock.mockResolvedValue(
        new Response("upstream error", {
          status: 503,
          statusText: "Service Unavailable",
        })
      )

      await expect(getWorkspaceBootstrap()).rejects.toThrow(
        "Auth service request failed with status 503."
      )
    } finally {
      clearCurrentStartRequest()
      withoutAuthServiceFetch()
    }
  })
})
