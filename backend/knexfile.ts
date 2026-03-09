import type { Knex } from 'knex'
import * as dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env['POSTGRES_HOST'] ?? 'localhost',
    port: Number(process.env['POSTGRES_PORT'] ?? 5432),
    database: process.env['POSTGRES_DB'] ?? 'radassist',
    user: process.env['POSTGRES_USER'] ?? 'radassist',
    password: process.env['POSTGRES_PASSWORD'] ?? 'radassist_dev',
  },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  pool: { min: 2, max: 10 },
}

export default config
