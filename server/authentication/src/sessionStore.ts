import RedisStore from 'connect-redis'
import { redisClient } from './cache'

export const store = new RedisStore({
  client: redisClient,
})
