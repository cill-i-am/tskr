import { authDatabaseSchema, createDatabase } from "@workspace/db"

const { db: database, pool } = createDatabase({ schema: authDatabaseSchema })

export { database, pool }
