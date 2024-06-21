import Koa from 'koa'

const app = new Koa()

app.use(async ctx => {
  ctx.body = 'Hello World'
})

app.listen(process.env.AUTHENTICATION_APP_PORT)
