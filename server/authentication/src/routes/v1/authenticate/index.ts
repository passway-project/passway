import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

export const routeName = 'authenticate'

export const autheticateRoute: FastifyPluginAsync = async app => {
  app.post<{
    Body: {
      id: User['passkeyId']
    }
    Reply: { success: boolean; challenge?: string }
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['authentication'],
        summary: 'Retrieve an authentication challenge',
        body: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              default: 'abc123',
            },
          },
        },
        response: {
          [StatusCodes.OK]: {
            description: 'User found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              challenge: {
                type: 'string',
                description:
                  'No matching user record for the given ID was found',
              },
            },
          },
          [StatusCodes.NOT_FOUND]: {
            description: 'User not found',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const requestBody = req.body
      const { id: passkeyId } = requestBody
      let retrievedUser: User | undefined

      try {
        retrievedUser = await app.prisma.user.findFirstOrThrow({
          where: { passkeyId },
        })
      } catch (e) {
        app.log.info(`passkeyId ${passkeyId} not found`)
        reply.code(StatusCodes.NOT_FOUND)
        reply.send({ success: false })
        return
      }

      reply.send({ success: true })
    }
  )
}
