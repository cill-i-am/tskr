interface PendingKeyedRequest<TKey, TValue> {
  key: TKey
  promise: Promise<TValue>
}

const clearPendingPromiseWhenSettled = async (
  promise: Promise<unknown>,
  clearPendingRequest: () => void
) => {
  try {
    await promise
  } catch {
    // The original caller handles the rejection.
  } finally {
    clearPendingRequest()
  }
}

const createKeyedSingleFlight = <TKey, TValue>(
  load: (key: TKey) => Promise<TValue>
) => {
  let pendingRequest: PendingKeyedRequest<TKey, TValue> | undefined

  return (key: TKey) => {
    if (pendingRequest && Object.is(pendingRequest.key, key)) {
      return pendingRequest.promise
    }

    const promise = load(key)

    pendingRequest = {
      key,
      promise,
    }

    const clearPendingRequest = () => {
      setTimeout(() => {
        if (pendingRequest?.promise === promise) {
          pendingRequest = undefined
        }
      }, 0)
    }

    clearPendingPromiseWhenSettled(promise, clearPendingRequest)

    return promise
  }
}

const createSingleFlight = <TValue>(load: () => Promise<TValue>) => {
  let pendingRequest: Promise<TValue> | undefined

  return () => {
    if (pendingRequest) {
      return pendingRequest
    }

    const promise = load()
    pendingRequest = promise

    const clearPendingRequest = () => {
      setTimeout(() => {
        if (pendingRequest === promise) {
          pendingRequest = undefined
        }
      }, 0)
    }

    clearPendingPromiseWhenSettled(promise, clearPendingRequest)

    return promise
  }
}

export { createKeyedSingleFlight, createSingleFlight }
