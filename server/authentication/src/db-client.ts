import pg from 'pg'

const dbContainerName = 'db'

export const dbClient = new pg.Client({
  database: process.env.DB_NAME,
  host: dbContainerName,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
})
