import { app } from './app'

export const initRoutes = () => {
  app.route({
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

  // FIXME: Implement versioning: https://fastify.dev/docs/latest/Reference/Routes/#route-prefixing
  app.put(
    '/user',
    {
      schema: {
        description: 'post some data',
        tags: ['user', 'code'],
        summary: 'Endpoint for creating/updating a user record',
        params: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'user id',
            },
          },
        },
        body: {
          type: 'object',
          properties: {
            hello: { type: 'string' },
            obj: {
              type: 'object',
              properties: {
                some: { type: 'string' },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Successful response',
            type: 'object',
            properties: {
              hello: { type: 'string' },
            },
          },
          default: {
            description: 'Default response',
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
          },
        },
      },
    },
    (req, reply) => {}
  )
}
