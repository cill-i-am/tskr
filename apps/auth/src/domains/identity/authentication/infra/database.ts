import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { parseAuthenticationEnv } from "./env.js"

const authenticationEnv = parseAuthenticationEnv()
const pool = new Pool({
  connectionString: authenticationEnv.databaseUrl,
})
const database = drizzle(pool)

export { database, pool }
