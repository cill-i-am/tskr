import type { HTTPException } from "hono/http-exception"

import { createWorkspaceService } from "./workspace-service.js"

const createService = ({
  authApi = {},
  repository = {},
}: {
  authApi?: Record<string, unknown>
  repository?: Record<string, unknown>
}) =>
  createWorkspaceService({
    auth: {
      api: authApi,
    },
    buildWorkspaceInviteAcceptUrl: (code) =>
      `https://app.example.com/join-workspace?code=${code}`,
    repository: repository as never,
    verifyWorkspaceInviteToken: () => null,
  })

describe("workspace service", () => {
  it("requires authentication before checking invite validity", async () => {
    const findInvitationByCode = vi.fn()
    const service = createService({
      authApi: {
        getSession: vi.fn().mockResolvedValue(null),
      },
      repository: {
        findInvitationByCode,
      },
    })

    await expect(
      service.acceptInvite(new Headers(), {
        code: "ABCD1234",
      })
    ).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<HTTPException>)

    expect(findInvitationByCode).not.toHaveBeenCalled()
  })

  it("preserves retryable upstream statuses from Better Auth", async () => {
    const service = createService({
      authApi: {
        createInvitation: vi.fn().mockRejectedValue({
          message: "Temporarily unavailable",
          status: 503,
        }),
        getSession: vi.fn().mockResolvedValue({
          session: {
            activeOrganizationId: "workspace_123",
            token: "session-token",
          },
          user: {
            email: "owner@example.com",
            id: "user_123",
          },
        }),
      },
      repository: {
        findMembershipByUserAndWorkspace: vi.fn().mockResolvedValue({
          id: "member_123",
          role: "owner",
          userId: "user_123",
          workspaceId: "workspace_123",
        }),
      },
    })

    await expect(
      service.createInvite(
        new Headers(),
        "workspace_123",
        "crew@example.com",
        "dispatcher"
      )
    ).rejects.toMatchObject({
      status: 503,
    } satisfies Partial<HTTPException>)
  })
})
