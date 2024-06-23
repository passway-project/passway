import Fastify from 'fastify'

const fastify = Fastify({
  logger: true,
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
;(async () => {
  try {
    await fastify.listen({ host: '0.0.0.0', port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})()
