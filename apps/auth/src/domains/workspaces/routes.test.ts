import { createWorkspaceRoutes } from "./routes.js"

describe("workspace routes", () => {
  it("creates workspaces through the service without a bootstrap preflight", async () => {
    const createWorkspace = vi.fn().mockResolvedValue({
      activeWorkspace: null,
      memberships: [],
      pendingInvites: [],
      recoveryState: "onboarding_required",
    })
    const getWorkspaceBootstrap = vi.fn()
    const routes = createWorkspaceRoutes({
      service: {
        createWorkspace,
        getWorkspaceBootstrap,
      } as never,
      trustedOrigins: ["http://localhost:3000"],
    })

    const response = await routes.request("/api/workspaces", {
      body: JSON.stringify({
        name: "Ops Control",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(response.status).toBe(200)
    expect(getWorkspaceBootstrap).not.toHaveBeenCalled()
    expect(createWorkspace).toHaveBeenCalledTimes(1)
  })
})
