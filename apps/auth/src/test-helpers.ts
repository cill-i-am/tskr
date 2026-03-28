/**
 * Asserts that a value is neither null nor undefined, returning
 * the narrowed type. Throws with the given message on failure.
 */
const requireValue = <Value>(
  value: Value | null | undefined,
  message: string
): Value => {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  return value
}

export { requireValue }
