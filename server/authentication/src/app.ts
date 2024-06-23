import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

// NOTE: Invoke async because top-level await isn't supported until this is
// shipped: https://github.com/TypeStrong/ts-node/pull/2073
;(async () => {
  const fastify = Fastify({
    logger: true,
  })

  await fastify.register(swagger)

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: true,
      tryItOutEnabled: true,
    },
  })

  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      // the response needs to be an object with an `hello` property of type 'string'
      response: {
        200: {
          type: 'object',
          properties: {
            hello: { type: 'string' },
          },
        },
      },
    },
    // this function is executed for every request before the handler is executed
    preHandler: (request, reply, done) => {
      // E.g. check authentication
      done()
    },
    handler: (request, reply) => {
      reply.send({ hello: 'world' })
    },
  })

  try {
    await fastify.listen({ host: '0.0.0.0', port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})()
