import Koa from 'koa'

const app = new Koa()

app.use(async ctx => {
  ctx.body = 'Hello World'
})

app.listen(process.env.INTERNAL_AUTHENTICATION_APP_PORT)
