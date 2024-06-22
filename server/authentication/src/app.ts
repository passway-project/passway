import Koa from 'koa'
import Router from 'koa-router'

const app = new Koa()
const router = new Router()

app.listen(3000)

app.use(router.routes()).use(router.allowedMethods())

router.get('/', ctx => {
  ctx.body = 'Hello World'
})
