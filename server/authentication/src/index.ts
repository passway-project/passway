import { dbClient } from './db-client'

dbClient.connect().then(() => {
  import('./app')
})
