import { defineConfig } from "tsdown"

export default defineConfig({
  clean: true,
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: true,
  entry: {
    index: "src/index.ts",
  },
  format: "esm",
  hash: false,
  outDir: "dist",
  platform: "node",
})
