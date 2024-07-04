import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

export const routeName = 'user'

export const userRoute: FastifyPluginAsync = async app => {
  app.put<{
    Body: {
      id: User['passkeyId']
      encryptedKeys: User['encryptedKeys']
      publicKey: User['publicKey']
    }
    Reply: { success: boolean }
  }>(
    `/${routeName}`,
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
            encryptedKeys: {
              type: 'string',
              description:
                'Base 64 encoded, encrypted, public/private key pair. DO NOT provide unencrypted data.',
              default: 'ZW5jcnlwdGVkIGtleQo=',
            },
            publicKey: {
              type: 'string',
              description: 'Base 64 encoded, unencrypted, public key.',
              default: 'cHVibGljIGtleQo=',
            },
          },
        },
        response: {
          [StatusCodes.CREATED]: {
            description: 'User created',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          [StatusCodes.OK]: {
            description: 'User updated',
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
      const { id: passkeyId, encryptedKeys, publicKey } = requestBody
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
          encryptedKeys,
          publicKey,
        }

        const isNewUser = typeof retrievedUser?.id === 'undefined'

        const upsertedUser = await app.prisma.user.upsert({
          create: userRecord,
          update: {
            encryptedKeys,
            publicKey,
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
