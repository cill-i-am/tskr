import { defineConfig } from "vitest/config"

const config = defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    include: ["src/**/*.test.ts"],
  },
})

export default config
