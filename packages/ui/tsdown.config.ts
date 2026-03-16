import { defineConfig } from "tsdown"

export default defineConfig({
  clean: true,
  copy: [
    {
      from: "src/styles/globals.css",
      rename: "globals.css",
    },
  ],
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: true,
  entry: {
    "components/button": "src/components/button-entry.ts",
    "components/card": "src/components/card.tsx",
    "components/field": "src/components/field.tsx",
    "components/input": "src/components/input.tsx",
    "components/label": "src/components/label.tsx",
    "components/separator": "src/components/separator.tsx",
    index: "src/index.ts",
  },
  format: "esm",
  hash: false,
  outDir: "dist",
  platform: "neutral",
})
