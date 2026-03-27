/* eslint-disable @typescript-eslint/consistent-type-imports */

const { authHandlerMock, connectMock, queryMock } = vi.hoisted(() => ({
  authHandlerMock: vi.fn(),
  connectMock: vi.fn(),
  queryMock: vi.fn(),
}))

vi.mock<typeof import("./infra/auth.js")>(import("./infra/auth.js"), () => ({
  auth: {
    handler: authHandlerMock,
  } as never,
  authenticationEnv: {
    betterAuthSecret: "test-secret",
    betterAuthUrl: "http://localhost:3002",
    emailFrom: "TSKR <noreply@tskr.app>",
    emailProvider: "console",
    emailReplyTo: "support@tskr.app",
    resendApiKey: undefined,
    trustedOrigins: ["http://localhost:3000"],
    webBaseUrl: "http://localhost:3000",
  },
}))

vi.mock<typeof import("./infra/database.js")>(
  import("./infra/database.js"),
  () => ({
    pool: {
      connect: connectMock,
      query: queryMock,
    } as never,
  })
)

const { authenticationRoutes } = await import("./routes.js")

declare global {
  interface PromiseConstructor {
    withResolvers<Value>(): {
      promise: Promise<Value>
      reject: (reason?: unknown) => void
      resolve: (value?: Value | PromiseLike<Value>) => void
    }
  }
}

const createDeferred = () => {
  const { promise, resolve } = Promise.withResolvers<undefined>()

  return {
    promise,
    resolve: () => {
      resolve()
    },
  }
}

const createJsonResponse = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
  })

const resetRouteMocks = () => {
  authHandlerMock.mockReset()
  connectMock.mockReset()
  queryMock.mockReset()
}

const createDuplicateSignupPoolClient = (existingEmails: Set<string>) => {
  const activeLocks = new Set<string>()
  const lockWaiters = new Map<string, (() => void)[]>()

  const waitForLock = async (email: string) => {
    if (!activeLocks.has(email)) {
      activeLocks.add(email)
      return
    }

    const deferred = createDeferred()
    const waiters = lockWaiters.get(email) ?? []

    waiters.push(deferred.resolve)
    lockWaiters.set(email, waiters)

    await deferred.promise
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

  return {
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
  }
}

const readRequestEmail = async (request: Request) =>
  ((await request.clone().json()) as { email: string }).email

const createDuplicateSignupAuthHandler =
  ({
    existingEmails,
    releaseFirstSignUp,
  }: {
    existingEmails: Set<string>
    releaseFirstSignUp: ReturnType<typeof createDeferred>
  }) =>
  async (request: Request) => {
    const email = await readRequestEmail(request)

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
  }

describe("authentication routes", () => {
  it("passes malformed signup payloads through to Better Auth", async () => {
    resetRouteMocks()

    authHandlerMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          code: "INVALID_EMAIL",
        },
        400
      )
    )

    const response = await authenticationRoutes.request(
      "/api/auth/sign-up/email",
      {
        body: "{",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }
    )

    expect(authHandlerMock).toHaveBeenCalledOnce()
    expect(response.status).toBe(400)
  })

  it("serializes duplicate signup attempts and rejects the second request", async () => {
    resetRouteMocks()

    const existingEmails = new Set<string>()
    const releaseFirstSignUp = createDeferred()

    connectMock.mockReturnValue(createDuplicateSignupPoolClient(existingEmails))
    authHandlerMock.mockImplementation(
      createDuplicateSignupAuthHandler({
        existingEmails,
        releaseFirstSignUp,
      })
    )

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
