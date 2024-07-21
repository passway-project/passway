import Redis from 'ioredis'

// NOTE: This is a reference to the Docker container name.
const cacheContainerName = 'cache'

export const redisClient = new Redis({
  port: Number(process.env.CACHE_PORT),
  host: cacheContainerName,
  password: process.env.CACHE_PASSWORD,
})
