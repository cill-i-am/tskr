const {
  authHandlerMock,
  connectMock,
  queryMock,
} = vi.hoisted(() => ({
  authHandlerMock: vi.fn(),
  connectMock: vi.fn(),
  queryMock: vi.fn(),
}))

vi.mock<typeof import("./infra/auth.js")>(import("./infra/auth.js"), () => ({
  auth: {
    handler: authHandlerMock,
  },
  authenticationEnv: {
    trustedOrigins: ["http://localhost:3000"],
  },
}))

vi.mock<typeof import("./infra/database.js")>(
  import("./infra/database.js"),
  () => ({
    pool: {
      connect: connectMock,
      query: queryMock,
    },
  })
)

const { authenticationRoutes } = await import("./routes.js")

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

const createJsonResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
  })

describe("authentication routes", () => {
  beforeEach(() => {
    authHandlerMock.mockReset()
    connectMock.mockReset()
    queryMock.mockReset()
  })

  it("passes malformed signup payloads through to Better Auth", async () => {
    authHandlerMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          code: "INVALID_EMAIL",
        },
        400
      )
    )

    const response = await authenticationRoutes.request("/api/auth/sign-up/email", {
      body: "{",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    })

    expect(authHandlerMock).toHaveBeenCalledOnce()
    expect(response.status).toBe(400)
  })

  it("serializes duplicate signup attempts and rejects the second request", async () => {
    const existingEmails = new Set<string>()
    const releaseFirstSignUp = createDeferred()
    const activeLocks = new Set<string>()
    const lockWaiters = new Map<string, Array<() => void>>()

    const waitForLock = async (email: string) => {
      if (!activeLocks.has(email)) {
        activeLocks.add(email)
        return
      }

      await new Promise<void>((resolve) => {
        const waiters = lockWaiters.get(email) ?? []

        waiters.push(resolve)
        lockWaiters.set(email, waiters)
      })

      activeLocks.add(email)
    }

    const releaseLock = (email: string) => {
      const waiters = lockWaiters.get(email)
      const nextWaiter = waiters?.shift()

      if (waiters && waiters.length === 0) {
        lockWaiters.delete(email)
      }

      activeLocks.delete(email)
      nextWaiter?.()
    }

    connectMock.mockImplementation(async () => ({
      query: async (sql: string, params?: string[]) => {
        const email = params?.at(0) ?? ""

        if (sql.includes("pg_advisory_lock")) {
          await waitForLock(email)

          return {
            rows: [],
          }
        }

        if (sql.includes("pg_advisory_unlock")) {
          releaseLock(email)

          return {
            rows: [{ pg_advisory_unlock: true }],
          }
        }

        if (sql.includes("SELECT EXISTS")) {
          return {
            rows: [{ exists: existingEmails.has(email) }],
          }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
      release: vi.fn(),
    }))

    authHandlerMock.mockImplementation(async (request: Request) => {
      const { email } = (await request.clone().json()) as { email: string }

      if (authHandlerMock.mock.calls.length === 1) {
        await releaseFirstSignUp.promise
        existingEmails.add(email)
      }

      return createJsonResponse({
        token: null,
        user: {
          email,
        },
      })
    })

    const requestInit = {
      body: JSON.stringify({
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "password-1234",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    } satisfies RequestInit

    const firstResponsePromise = authenticationRoutes.request(
      "/api/auth/sign-up/email",
      requestInit
    )
    const secondResponsePromise = authenticationRoutes.request(
      "/api/auth/sign-up/email",
      requestInit
    )

    releaseFirstSignUp.resolve()

    const [firstResponse, secondResponse] = await Promise.all([
      firstResponsePromise,
      secondResponsePromise,
    ])

    expect(authHandlerMock).toHaveBeenCalledOnce()
    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(422)
    await expect(secondResponse.json()).resolves.toMatchObject({
      code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    })
  })
})
