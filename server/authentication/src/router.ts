import Router from 'koa-router'

export const router = new Router()

export const initRoutes = () => {
  router.get('/', ctx => {
    ctx.body = 'Hello World'
  })
}
