const noop = () => null

const ResizeObserverMock = function ResizeObserverMock(this: {
  __resizeObserverMock?: boolean
}) {
  Object.defineProperty(this, "__resizeObserverMock", {
    configurable: true,
    value: true,
  })
}

ResizeObserverMock.prototype.disconnect = noop
ResizeObserverMock.prototype.observe = noop
ResizeObserverMock.prototype.unobserve = noop

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
