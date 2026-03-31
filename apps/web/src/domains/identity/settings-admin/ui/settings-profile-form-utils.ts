const toNullableTrimmedValue = (value: string) => {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

export { toNullableTrimmedValue }
