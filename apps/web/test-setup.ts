const ResizeObserverMock = class ResizeObserverMock {
  disconnect = () => undefined

  observe = () => undefined

  unobserve = () => undefined
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverMock,
  writable: true,
})

Object.defineProperty(document, "elementFromPoint", {
  configurable: true,
  value: () => null,
  writable: true,
})
