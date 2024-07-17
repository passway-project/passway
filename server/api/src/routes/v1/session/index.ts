import { webcrypto } from 'crypto'

import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import httpErrors from 'http-errors'

declare module 'fastify' {
  interface Session {
    authenticated?: boolean
    userId?: User['id']
  }
}

export const routeName = 'session'

export const signatureMessage = '!!Passway_Signature_Base!!'

export const sessionRoute: FastifyPluginAsync = async app => {
  app.get<{
    Headers: {
      'x-passway-id': User['passkeyId']
      'x-passway-signature': string
    }
    Reply:
      | { token?: string }
      | ReturnType<typeof httpErrors.InternalServerError>
      | ReturnType<typeof httpErrors.BadRequest>
      | ReturnType<typeof httpErrors.NotFound>
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['Session management'],
        summary: 'Retrieve a session token',
        headers: {
          type: 'object',
          properties: {
            'x-passway-id': {
              type: 'string',
              description: 'User ID',
            },
            'x-passway-signature': {
              type: 'string',
              description: `Signed, base 64 version of the string "${signatureMessage}" to validate`,
            },
          },
          required: ['x-passway-id', 'x-passway-signature'],
        },
        response: {
          [StatusCodes.OK]: {
            description: 'Session created',
            type: 'object',
          },
          [StatusCodes.BAD_REQUEST]: {
            description: 'Signature invalid',
            type: 'object',
            properties: {
              message: { type: 'string' },
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
      const { 'x-passway-id': passkeyId, 'x-passway-signature': signature } =
        request.headers
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

      const { publicKey } = retrievedUser
      let isValid = false

      try {
        const rawSignature = Buffer.from(signature, 'base64')
        const rawPublicKey = Buffer.from(publicKey, 'base64')
        const importedPublicKey = await webcrypto.subtle.importKey(
          'spki',
          rawPublicKey,
          {
            name: 'ECDSA',
            namedCurve: 'P-256',
            hash: 'SHA-256',
          },
          true,
          ['verify']
        )

        const encodedSignature = new TextEncoder().encode(signatureMessage)

        isValid = await webcrypto.subtle.verify(
          {
            name: 'ECDSA',
            hash: 'SHA-256',
            saltLength: 32,
          },
          importedPublicKey,
          rawSignature,
          encodedSignature
        )
      } catch (e) {
        app.log.error(`Signature verification failed: ${e}`)
      }

      if (isValid) {
        request.session.authenticated = true
        request.session.userId = retrievedUser.id

        try {
          await request.session.save()
        } catch (e) {
          app.log.error(`Session storage failure: ${e}`)
          reply.send(httpErrors.InternalServerError('Session storage failure'))
          return
        }
      } else {
        reply.send(httpErrors.BadRequest('Invalid signature'))
        return
      }
    }
  )

  app.delete<{
    Headers: {
      sessionId: string
    }
    Reply: ReturnType<typeof httpErrors.InternalServerError>
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['Session management'],
        summary: 'Delete session',
        response: {
          [StatusCodes.OK]: {
            description: 'Session deletion success',
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        await request.session.destroy()
      } catch (e) {
        app.log.error(`Session deletion failure: ${e}`)
        reply.send(httpErrors.InternalServerError('Session deletion failure'))
        return
      }
    }
  )
}
