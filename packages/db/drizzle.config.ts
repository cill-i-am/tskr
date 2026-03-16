import { defineConfig } from "drizzle-kit"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for Drizzle")
}

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  dialect: "postgresql",
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  out: "./drizzle",
  schema: ["./src/schema/auth.ts", "./src/schema/app.ts"],
})
