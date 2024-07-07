import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

export const routeName = 'user'

export const userRoute: FastifyPluginAsync = async app => {
  app.get<{
    Headers: {
      'x-user-id': User['passkeyId']
    }
    Reply: {
      success: boolean
      user?: { publicKey: User['publicKey']; keys: User['encryptedKeys'] }
    }
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['user'],
        summary: 'Get a user record',
        headers: {
          type: 'object',
          properties: {
            'x-user-id': {
              type: 'string',
              description: 'User ID to look up',
            },
          },
        },
        response: {
          [StatusCodes.OK]: {
            description: 'User found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              user: {
                type: 'object',
                properties: {
                  publicKey: {
                    type: 'string',
                  },
                  keys: {
                    type: 'string',
                  },
                },
              },
            },
          },
          [StatusCodes.NOT_FOUND]: {
            description: 'User not found',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const requestHeaders = req.headers
      const { 'x-user-id': passkeyId } = requestHeaders
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

      reply.send({
        success: true,
        user: {
          keys: retrievedUser.encryptedKeys,
          publicKey: retrievedUser.publicKey,
        },
      })
    }
  )

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
            },
            encryptedKeys: {
              type: 'string',
              description:
                'Base 64 encoded, encrypted, public/private key pair. DO NOT provide unencrypted data.',
            },
            publicKey: {
              type: 'string',
              description: 'Base 64 encoded, unencrypted, public key.',
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
