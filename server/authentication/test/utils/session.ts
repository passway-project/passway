import { PrismaClient, User } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { DeepMockProxy } from 'jest-mock-extended'

import {
  routeName as sessionRouteName,
  signatureMessage,
} from '../../src/routes/v1/session'
import { API_ROOT } from '../../src/constants'

import { getSignature } from './crypto'

export const requestSession = async (
  app: FastifyInstance,
  {
    userId,
    encryptedKeys,
    publicKey,
    privateKey,
  }: {
    userId: number
    encryptedKeys: string
    publicKey: string
    privateKey: string
  }
) => {
  const passkeyId = 'foo'
  const now = Date.now()
  const preexistingUser: User = {
    id: userId,
    passkeyId,
    encryptedKeys,
    publicKey,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }

  const signature = await getSignature(signatureMessage, {
    privateKey,
  })
  const signatureHeader = Buffer.from(signature).toString('base64')

  ;(
    app.prisma as DeepMockProxy<PrismaClient>
  ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)

  return app.inject({
    method: 'GET',
    url: `/${API_ROOT}/v1/${sessionRouteName}`,
    headers: {
      'x-passway-id': passkeyId,
      'x-passway-signature': signatureHeader,
    },
  })
}
