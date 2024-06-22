import Koa from 'koa'
import Router from 'koa-router'
import pg from 'pg'

const dbContainerName = 'db'

const dbClient = new pg.Client({
  database: process.env.DB_NAME,
  host: dbContainerName,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
})

const app = new Koa()
const router = new Router()

dbClient.connect().then(() => {
  router.get('/', ctx => {
    ctx.body = 'Hello World'
  })
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
