import { drizzle } from "drizzle-orm/node-postgres"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import type { PoolConfig } from "pg"

import { resolveDatabaseUrl } from "./database-url"
import * as authSchema from "./schema/auth"

type DrizzleSchema = Record<string, unknown>

export interface CreatePgPoolOptions {
  databaseUrl?: string
  env?: NodeJS.ProcessEnv
  poolConfig?: Omit<PoolConfig, "connectionString">
}

export interface CreateDatabaseOptions<
  TSchema extends DrizzleSchema,
> extends CreatePgPoolOptions {
  schema?: TSchema
}

export const createPgPool = (options: CreatePgPoolOptions = {}): Pool =>
  new Pool({
    ...options.poolConfig,
    connectionString: resolveDatabaseUrl(options),
  })

export const createDatabase = <
  TSchema extends DrizzleSchema = typeof authSchema,
>(
  options: CreateDatabaseOptions<TSchema> = {}
): {
  db: NodePgDatabase<TSchema>
  pool: Pool
} => {
  const { schema = authSchema as unknown as TSchema, ...poolOptions } = options
  const pool = createPgPool(poolOptions)

  return {
    db: drizzle(pool, { schema }),
    pool,
  }
}

export const closePool = async (pool: Pool): Promise<void> => {
  await pool.end()
}
