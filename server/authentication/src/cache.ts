import Cache from 'iovalkey'

const cacheContainerName = 'cache'

export const cache = new Cache({
  port: Number(process.env.CACHE_PORT),
  host: cacheContainerName,
  password: process.env.CACHE_PASSWORD,
})
