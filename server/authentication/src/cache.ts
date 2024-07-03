import Redis from 'ioredis'

const cacheContainerName = 'cache'

export const redisClient = new Redis({
  port: Number(process.env.CACHE_PORT),
  host: cacheContainerName,
  password: process.env.CACHE_PASSWORD,
})
