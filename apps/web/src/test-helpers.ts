const START_EVENT_STORAGE_KEY = Symbol.for("tanstack-start:event-storage")

interface StartRequestStore {
  getStore?: () =>
    | {
        h3Event?: {
          req?: Request | undefined
        }
      }
    | undefined
}

const setCurrentStartRequest = (request: Request | undefined) => {
  ;(
    globalThis as typeof globalThis & {
      [START_EVENT_STORAGE_KEY]?: StartRequestStore | undefined
    }
  )[START_EVENT_STORAGE_KEY] = {
    getStore: () =>
      request
        ? {
            h3Event: {
              req: request,
            },
          }
        : undefined,
  }
}

const clearCurrentStartRequest = () => {
  ;(
    globalThis as typeof globalThis & {
      [START_EVENT_STORAGE_KEY]?: StartRequestStore | undefined
    }
  )[START_EVENT_STORAGE_KEY] = undefined
}

const withoutWindow = async <T>(run: () => Promise<T>) => {
  const previousWindow = globalThis.window

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: undefined,
  })

  try {
    return await run()
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: previousWindow,
    })
  }
}

export { clearCurrentStartRequest, setCurrentStartRequest, withoutWindow }
