import { app } from './app'
import { initRoutes } from './routes'
import { dbClient } from './db-client'

dbClient.connect().then(async () => {
  initRoutes()

  try {
    await app.listen({ host: '0.0.0.0', port: 3000 })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
})
