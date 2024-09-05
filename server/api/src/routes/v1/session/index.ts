import { webcrypto } from 'crypto'

import httpErrors from 'http-errors'
import { StatusCodes } from 'http-status-codes'
import { FastifyPluginAsync } from 'fastify'
import { User } from '@prisma/client'

import {
  signatureKeyHashingAlgorithm,
  sessionKeyName,
  signatureKeyAlgorithmName,
  signatureKeyNamedCurve,
  signatureKeySaltLength,
} from '../../../constants'

declare module 'fastify' {
  interface Session {
    authenticated?: boolean
    userId?: User['id']
  }
}

export const routeName = 'session'

// TODO: Rather than use a hardcoded signature base, make it dynamic per-session
export const signatureMessage = '!!Passway_Signature_Base!!'

export const sessionRoute: FastifyPluginAsync = async app => {
  app.get<{
    Headers: {
      'x-passway-id': User['passkeyId']
      'x-passway-signature': string
    }
    Reply:
      | ReturnType<typeof httpErrors.InternalServerError>
      | ReturnType<typeof httpErrors.BadRequest>
      | ReturnType<typeof httpErrors.NotFound>
  }>(
    `/${routeName}`,
    {
      schema: {
        tags: ['Session management'],
        summary: 'Create a session',
        headers: {
          type: 'object',
          properties: {
            'x-passway-id': {
              type: 'string',
              description: 'User ID',
            },
            'x-passway-signature': {
              type: 'string',
              description: `Signed, base 64 version of the string \`"${signatureMessage}"\` to validate`,
            },
          },
          required: ['x-passway-id', 'x-passway-signature'],
        },
        response: {
          [StatusCodes.OK]: {
            description: `Session created. This response returns a session cookie called \`${sessionKeyName}\`.`,
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
            name: signatureKeyAlgorithmName,
            namedCurve: signatureKeyNamedCurve,
            hash: signatureKeyHashingAlgorithm,
          },
          true,
          ['verify']
        )

        const encodedSignature = new TextEncoder().encode(signatureMessage)

        isValid = await webcrypto.subtle.verify(
          {
            name: signatureKeyAlgorithmName,
            hash: signatureKeyHashingAlgorithm,
            saltLength: signatureKeySaltLength,
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
      [sessionKeyName]: string
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
        // NOTE: This deletes the session cookie on the client
        reply.cookie(sessionKeyName, request.session.encryptedSessionId, {
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })

        await request.session.destroy()
      } catch (e) {
        app.log.error(`Session deletion failure: ${e}`)
        reply.send(httpErrors.InternalServerError('Session deletion failure'))
        return
      }
    }
  )
}
