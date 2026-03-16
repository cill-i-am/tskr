import { fileURLToPath } from "node:url"

import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const uiDistPath = fileURLToPath(
  new URL("../../packages/ui/dist", import.meta.url)
)

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@workspace/ui": uiDistPath,
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000/login",
      },
    },
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})

export default config
