const toNullableTrimmedValue = (value: string) => {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : null
}

const selectPreviewFormValues = <T extends { name: string }>(state: {
  values: T
}) => state.values

export { selectPreviewFormValues, toNullableTrimmedValue }
