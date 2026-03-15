import { verifyUiPropagation } from "./lib/ui-propagation.mjs"

const result = await verifyUiPropagation()

console.log(`Verified UI propagation at ${result.appUrl}`)
