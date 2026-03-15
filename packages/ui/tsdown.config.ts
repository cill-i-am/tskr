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
    index: "src/index.ts",
  },
  format: "esm",
  hash: false,
  outDir: "dist",
  platform: "neutral",
})
