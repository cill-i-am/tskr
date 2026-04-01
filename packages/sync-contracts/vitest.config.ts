import { defineConfig } from "vitest/config"

const config = defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
})

export default config
