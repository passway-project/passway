import Koa from 'koa'
import { initRoutes, router } from './router'

const app = new Koa()

app.use(router.routes()).use(router.allowedMethods())

initRoutes()

app.listen(3000)
