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

export const routeName = 'verify-signature'

// TODO: Make this configurable via an environment variable
export const signatureMessage = 'passway'

export const verifySignatureRoute: FastifyPluginAsync = async app => {
  app.post<{
    Body: {
      id: User['passkeyId']
      signature: string
    }
    Reply: { success: boolean; token?: string }
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['Session management'],
        summary: 'Retrieve a session token',
        body: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            signature: {
              type: 'string',
              description: `Signed, base 64 version of the string "${signatureMessage}" to validate`,
            },
          },
          required: ['id', 'signature'],
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
      const requestBody = req.body
      const { id: passkeyId, signature } = requestBody
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
        // FIXME Test this
        req.session.authenticated = true

        try {
          await req.session.save()
          reply.send({ success: true })
        } catch (e) {
          // FIXME Test this
          reply.code(StatusCodes.INTERNAL_SERVER_ERROR)
        }
      } else {
        reply.code(StatusCodes.BAD_REQUEST)
      }

      reply.send({ success: false })
    }
  )
}
