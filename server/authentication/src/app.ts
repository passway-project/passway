import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

export const app = Fastify({
  logger: true,
})

// NOTE: Invoke async because top-level await isn't supported until this is
// shipped: https://github.com/TypeStrong/ts-node/pull/2073
;(async () => {
  await app.register(swagger)

  await app.register(swaggerUi, {
    routePrefix: '/',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: true,
      tryItOutEnabled: true,
    },
  })
})()
