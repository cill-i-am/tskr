import assert from "node:assert/strict"
import test from "node:test"

import {
  BUTTON_MARKER_ATTRIBUTE,
  injectButtonVerificationMarker,
} from "./ui-propagation.mjs"

const BUTTON_SOURCE = `const Button = (props) => (
  <ButtonPrimitive
    data-slot="button"
    className={cn(buttonVariants({ className, size, variant }))}
    {...props}
  />
)
`

test("injects a visible verification marker into the button primitive", () => {
  const updatedSource = injectButtonVerificationMarker(BUTTON_SOURCE, "VERIFY")

  assert.match(updatedSource, /<ButtonPrimitive/)
  assert.match(updatedSource, /\{props\.children\}/)
  assert.match(updatedSource, new RegExp(BUTTON_MARKER_ATTRIBUTE))
  assert.match(updatedSource, />VERIFY<\/span>/)
  assert.doesNotMatch(updatedSource, /\n {2}\/>\n\)/)
})

test("rejects reinjecting a marker into the source", () => {
  const updatedSource = injectButtonVerificationMarker(BUTTON_SOURCE, "VERIFY")

  assert.throws(
    () => injectButtonVerificationMarker(updatedSource, "VERIFY"),
    /already contains the verification marker/
  )
})

test("rejects sources without the expected self-closing button primitive", () => {
  assert.throws(
    () =>
      injectButtonVerificationMarker("const Button = () => null\n", "VERIFY"),
    /Could not find the button primitive render block/
  )
})

test("injected marker uses the shared attribute selector", () => {
  const updatedSource = injectButtonVerificationMarker(BUTTON_SOURCE, "VERIFY")

  assert.match(
    updatedSource,
    new RegExp(`<span ${BUTTON_MARKER_ATTRIBUTE} className=`)
  )
})
