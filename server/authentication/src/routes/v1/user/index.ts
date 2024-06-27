import { FastifyPluginAsync } from 'fastify'
import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

const prisma = new PrismaClient()

export const userRoute: FastifyPluginAsync = async app => {
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
      const requestBody = req.body
      const passkeyId = requestBody.id
      let retrievedUser: User | undefined

      try {
        retrievedUser = await prisma.user.findFirstOrThrow({
          where: { passkeyId },
        })
      } catch (e) {
        app.log.info(`passkeyId ${passkeyId} not found`)
      }

      try {
        const userRecord = {
          passkeyId,
        }

        const isNewUser = typeof retrievedUser?.id === 'undefined'

        const upsertedUser = await prisma.user.upsert({
          create: userRecord,
          update: {},
          where: {
            id: retrievedUser?.id,
            passkeyId,
          },
        })

        if (isNewUser) {
          app.log.info(
            `user ${upsertedUser.id} created with ${JSON.stringify(userRecord)}`
          )

          reply.code(StatusCodes.CREATED)
        } else {
          app.log.info(
            `user ${upsertedUser.id} updated with ${JSON.stringify(userRecord)}`
          )

          reply.code(StatusCodes.OK)
        }
      } catch (e) {
        app.log.error(`user ${retrievedUser?.id} update failed:
${e}`)
        reply.code(StatusCodes.INTERNAL_SERVER_ERROR)
        reply.send({ success: false })
        return
      }

      reply.send({ success: true })
    }
  )
}
