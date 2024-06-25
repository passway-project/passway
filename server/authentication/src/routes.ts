import { FastifyPluginAsync } from 'fastify'
import { PrismaClient, User } from '@prisma/client'

const prisma = new PrismaClient()

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
    async (req, reply) => {
      try {
        // FIXME: Update retrieved user
        const retrievedUser = await prisma.user.findFirstOrThrow({
          where: { passkeyId: req.body.id },
        })

        reply.send({ success: true })
      } catch (e) {
        // FIXME: Log error
      }

      // FIXME: Implement route
      reply.send({ success: false })
    }
  )
}
