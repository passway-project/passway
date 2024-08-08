import { FastifyPluginAsync } from 'fastify'
import { User, Prisma } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import httpErrors from 'http-errors'

export type UserGetSuccessResponse = {
  user: {
    iv: User['iv']
    keys: User['encryptedKeys']
    salt: User['salt']
  }
}

export interface UserGetApi {
  Headers: {
    'x-passway-id': User['passkeyId']
  }
  Reply: UserGetSuccessResponse | ReturnType<typeof httpErrors.NotFound>
}

export const isUserGetSuccessResponse = (
  reply: UserGetApi['Reply']
): reply is UserGetSuccessResponse => {
  return 'user' in reply
}

export const routeName = 'user'

export const userRoute: FastifyPluginAsync = async app => {
  app.get<UserGetApi>(
    `/${routeName}`,
    {
      schema: {
        tags: ['User Management'],
        summary: 'Get a user record',
        headers: {
          type: 'object',
          properties: {
            'x-passway-id': {
              type: 'string',
              description: 'ID of user to look up',
            },
          },
          required: ['x-passway-id'],
        },
        response: {
          [StatusCodes.OK]: {
            description: 'User found',
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  iv: {
                    type: 'string',
                  },
                  keys: {
                    type: 'string',
                  },
                  salt: {
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
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const requestHeaders = request.headers
      const { 'x-passway-id': passkeyId } = requestHeaders
      let retrievedUser: User

      try {
        retrievedUser = await app.prisma.user.findFirstOrThrow({
          where: { passkeyId },
        })
      } catch (e) {
        app.log.info(`passkeyId ${passkeyId} not found`)
        reply.send(httpErrors.NotFound(`User ID ${passkeyId} not found`))
        return
      }

      reply.send({
        user: {
          iv: retrievedUser.iv,
          keys: retrievedUser.encryptedKeys,
          salt: retrievedUser.salt,
        },
      })
    }
  )

  app.put<{
    Body: {
      encryptedKeys: User['encryptedKeys']
      id: User['passkeyId']
      iv: User['iv']
      publicKey: User['publicKey']
      salt: User['salt']
    }
    Reply:
      | ReturnType<typeof httpErrors.Forbidden>
      | ReturnType<typeof httpErrors.InternalServerError>
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['User Management'],
        summary: 'Create or update a user record',
        body: {
          type: 'object',
          properties: {
            encryptedKeys: {
              type: 'string',
              description:
                'Base 64 encoded, encrypted, public/private key pair. DO NOT provide unencrypted data.',
            },
            id: {
              type: 'string',
              description: 'User ID',
            },
            iv: {
              type: 'string',
              description:
                'Base 64 encoded [initialization vector](https://en.wikipedia.org/wiki/Initialization_vector) that `encryptedKeys` was created with.',
            },
            publicKey: {
              type: 'string',
              description: 'Base 64 encoded, unencrypted, public key.',
            },
            salt: {
              type: 'string',
              description:
                'Base 64 encoded [salt](https://en.wikipedia.org/wiki/Salt_(cryptography)) string that `encryptedKeys` was created with.',
            },
          },
          required: ['encryptedKeys', 'id', 'iv', 'publicKey', 'salt'],
        },
        response: {
          [StatusCodes.CREATED]: {
            description: 'User created',
            type: 'object',
          },
          [StatusCodes.OK]: {
            description: 'User updated',
            type: 'object',
          },
          [StatusCodes.FORBIDDEN]: {
            description: 'User not found',
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const requestBody = request.body
      const { id: passkeyId, encryptedKeys, publicKey, iv, salt } = requestBody
      let retrievedUser: User | undefined

      try {
        retrievedUser = await app.prisma.user.findFirstOrThrow({
          where: { passkeyId },
        })
      } catch (e) {
        app.log.info(`passkeyId ${passkeyId} not found`)
      }

      try {
        const userRecord: Prisma.UserUpsertArgs['create'] = {
          passkeyId,
          encryptedKeys,
          publicKey,
          iv,
          salt,
        }

        const isNewUser = typeof retrievedUser?.id === 'undefined'

        if (
          !isNewUser &&
          (!request.session.authenticated ||
            request.session.userId !== retrievedUser?.id)
        ) {
          reply.send(httpErrors.Forbidden('Permission denied'))
          return
        }

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
        app.log.error(`User ${retrievedUser?.id} update failed: ${e}`)
        reply.send(httpErrors.InternalServerError())
        return
      }
    }
  )
}
