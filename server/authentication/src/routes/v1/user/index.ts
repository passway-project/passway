import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

export const userRoute: FastifyPluginAsync = async app => {
  app.put<{
    Body: {
      id: User['passkeyId']
      keyData: User['keyData']
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
              default: 'abc123',
            },
            keyData: {
              type: 'string',
              description:
                'Base 64 encoded, encrypted, public/private keypair. DO NOT provide unencrypted data.',
              default: 'ZW5jcnlwdGVkIGtleQo=',
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
      const { id: passkeyId, keyData } = requestBody
      let retrievedUser: User | undefined

      try {
        retrievedUser = await app.prisma.user.findFirstOrThrow({
          where: { passkeyId },
        })
      } catch (e) {
        app.log.info(`passkeyId ${passkeyId} not found`)
      }

      try {
        const userRecord = {
          passkeyId,
          keyData,
        }

        const isNewUser = typeof retrievedUser?.id === 'undefined'

        const upsertedUser = await app.prisma.user.upsert({
          create: userRecord,
          update: {
            keyData,
          },
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
