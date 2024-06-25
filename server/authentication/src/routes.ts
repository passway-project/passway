import { app } from './app'

const prefix = '/api/v1'
export const initRoutes = () => {
  app.register(
    async (app, options, done) => {
      app.put(
        '/user',
        {
          schema: {
            description: 'post some data',
            tags: ['user'],
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
              200: {
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
    },
    { prefix }
  )
}
