import { app } from './app'
import * as routes from './routes/index'

// NOTE: Invoke async because top-level await isn't supported until this is
// shipped: https://github.com/TypeStrong/ts-node/pull/2073
;(async () => {
  for (const route of Object.values(routes)) {
    app.register(route, { prefix: '/api/v1' })
  }

  try {
    await app.listen({ host: '0.0.0.0', port: 3000 })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
})()
