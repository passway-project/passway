import Koa from 'koa'
import pg from 'pg'
import { initRoutes, router } from './router'

const dbContainerName = 'db'

const dbClient = new pg.Client({
  database: process.env.DB_NAME,
  host: dbContainerName,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
})

const app = new Koa()

dbClient.connect().then(() => {
  initRoutes()
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
