import RedisStore from 'connect-redis'

import { redisClient } from './cache'

export const sessionStore = new RedisStore({
  client: redisClient,
})
