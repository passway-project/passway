import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { webcrypto } from 'crypto'
import { signatureKeyParams } from '../../../services/Encryption'

declare module 'fastify' {
  interface Session {
    authenticated?: boolean
  }
}

export const routeName = 'session'

// TODO: Make this configurable via an environment variable
export const signatureMessage = 'passway'

export const sessionRoute: FastifyPluginAsync = async app => {
  app.get<{
    Headers: {
      'x-passway-id': User['passkeyId']
      'x-passway-signature': string
    }
    Reply: { success: boolean; token?: string }
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
            properties: {
              success: { type: 'boolean' },
              token: {
                type: 'string',
                description:
                  'Session token to use in subsequent requests as x-passway-token header',
              },
            },
          },
          [StatusCodes.BAD_REQUEST]: {
            description: 'Signature invalid',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
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
      const requestHeaders = req.headers
      const { 'x-passway-id': passkeyId, 'x-passway-signature': signature } =
        requestHeaders
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

      const { publicKey } = retrievedUser
      let isValid = false

      try {
        const signatureBuffer = Buffer.from(signature, 'base64')
        const publicKeyBuffer = Buffer.from(publicKey, 'base64')
        const signaturePublicKeyBuffer = await webcrypto.subtle.importKey(
          'spki',
          publicKeyBuffer,
          {
            name: signatureKeyParams.algorithm.name,
            namedCurve: 'P-256',
            hash: 'SHA-256',
          },
          true,
          ['verify']
        )

        const dataBuffer = new TextEncoder().encode(signatureMessage)

        isValid = await webcrypto.subtle.verify(
          {
            name: signatureKeyParams.algorithm.name,
            hash: 'SHA-256',
            saltLength: 32,
          },
          signaturePublicKeyBuffer,
          signatureBuffer,
          dataBuffer
        )
      } catch (e) {
        reply.code(StatusCodes.BAD_REQUEST)
        reply.send({ success: false })
        return
      }

      if (isValid) {
        req.session.authenticated = true

        try {
          await req.session.save()
          reply.send({ success: true })
        } catch (e) {
          // FIXME Test this
          reply.code(StatusCodes.INTERNAL_SERVER_ERROR)
          app.log.error(`Session storage failure: ${e}`)
        }
      } else {
        reply.code(StatusCodes.BAD_REQUEST)
      }

      reply.send({ success: false })
    }
  )
}
