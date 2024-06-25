import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'

export const routes: FastifyPluginAsync = async app => {
  app.put<{
    Body: {
      id: User['passkeyId']
    }
    Reply: { success: boolean }
  }>(
    '/user',
    {
      schema: {
        tags: ['user'],
        summary: 'Create or update a user record',
        body: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
          },
        },
        response: {
          201: {
            description: 'User created',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    (req, reply) => {
      // FIXME: Implement route
      reply.send({ success: false })
    }
  )
}
