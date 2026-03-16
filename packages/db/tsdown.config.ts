export default {
  clean: true,
  deps: {
    skipNodeModulesBundle: true,
  },
  dts: true,
  entry: {
    client: "src/client.ts",
    index: "src/index.ts",
    "schema/app": "src/schema/app.ts",
    "schema/auth": "src/schema/auth.ts",
    "schema/index": "src/schema/index.ts",
  },
  format: "esm",
  hash: false,
  outDir: "dist",
  platform: "node",
}
