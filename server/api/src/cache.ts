import Redis from 'ioredis'

import { containerName } from './constants'

export const redisClient = new Redis({
  host: containerName.CACHE,
  password: process.env.CACHE_PASSWORD,
})
