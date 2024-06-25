import { app } from './app'
import { routes } from './routes'
import { dbClient } from './db-client'

dbClient.connect().then(async () => {
  app.register(routes, { prefix: '/api/v1' })

  try {
    await app.listen({ host: '0.0.0.0', port: 3000 })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
})
