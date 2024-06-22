import Koa from 'koa'
import pg from 'pg'

const dbContainerName = 'db'

const dbClient = new pg.Client({
  database: process.env.DB_NAME,
  host: dbContainerName,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
})

const app = new Koa()
await dbClient.connect()

app.use(async ctx => {
  ctx.body = 'Hello World'
})

app.listen(3000)
