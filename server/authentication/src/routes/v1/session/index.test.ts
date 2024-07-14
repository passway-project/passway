import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp, testAuthenticationRoute } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'
import { routeName, signatureMessage } from '.'
import { getKeypair } from '../../../../test/getKeypair'
import { signatureKeyParams } from '../../../services/Encryption'
import { getSignature } from '../../../../test/utils/crypto'
import { requestSession } from '../../../../test/utils/session'
import { StubKeyData, getStubKeyData } from '../../../../test/getStubKeyData'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const stubUserId = 0
const stubUserPasskeySecret = 'abc123'

const stubKeyData: StubKeyData = {
  publicKey: '',
  privateKey: '',
  encryptedKeysString: '',
}

const sessionCookie = {
  httpOnly: true,
  name: 'sessionId',
  path: '/',
  secure: true,
  value: expect.any(String),
}

beforeAll(async () => {
  Object.assign(stubKeyData, await getStubKeyData(stubUserPasskeySecret))
})

describe(endpointRoute, () => {
  describe('GET', () => {
    test('handles nonexistent user lookup', async () => {
      const app = getApp()
      const idHeader = 'foo'

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())

      const signature = await getSignature(signatureMessage, {
        privateKey: stubKeyData.privateKey,
      })

      const signatureHeader = Buffer.from(signature).toString('base64')

      const response = await app.inject({
        method: 'GET',
        url: endpointRoute,
        headers: {
          'x-passway-id': idHeader,
          'x-passway-signature': signatureHeader,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })

    test('creates session for valid user authentication request', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
        userId: stubUserId,
        encryptedKeys: stubKeyData.encryptedKeysString,
        publicKey: stubKeyData.publicKey,
        privateKey: stubKeyData.privateKey,
      })

      const bodyJson = await sessionResponse.json()

      expect(bodyJson).toEqual({ success: true })
      expect(sessionResponse.statusCode).toEqual(StatusCodes.OK)
      expect(sessionResponse.cookies).toContainEqual(sessionCookie)

      const authRequest = await app.inject({
        method: 'GET',
        url: testAuthenticationRoute,
        cookies: {
          sessionId: sessionResponse.cookies[0].value,
        },
      })

      expect(authRequest.statusCode).toEqual(StatusCodes.OK)
    })

    test('handles incorrect signature message', async () => {
      const app = getApp()
      const idHeader = 'foo'
      const now = Date.now()
      const preexistingUser: User = {
        id: stubUserId,
        passkeyId: idHeader,
        encryptedKeys: stubKeyData.encryptedKeysString,
        publicKey: stubKeyData.publicKey,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }

      const signature = await getSignature('some other message', {
        privateKey: stubKeyData.privateKey,
      })

      const signatureHeader = Buffer.from(signature).toString('base64')

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)

      const response = await app.inject({
        method: 'GET',
        url: endpointRoute,
        headers: {
          'x-passway-id': idHeader,
          'x-passway-signature': signatureHeader,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })

    test('handles invalid signature', async () => {
      const app = getApp()
      const idHeader = 'foo'
      const now = Date.now()
      const preexistingUser: User = {
        id: stubUserId,
        passkeyId: idHeader,
        encryptedKeys: stubKeyData.encryptedKeysString,
        publicKey: stubKeyData.publicKey,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }

      const differentSignatureKeys = await getKeypair(signatureKeyParams)
      const signature = await getSignature(signatureMessage, {
        privateKey: differentSignatureKeys.privateKey,
      })

      const signatureHeader = Buffer.from(signature).toString('base64')

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)

      const response = await app.inject({
        method: 'GET',
        url: endpointRoute,
        headers: {
          'x-passway-id': idHeader,
          'x-passway-signature': signatureHeader,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })
  })

  describe('DELETE', () => {
    test('deletes a session', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
        userId: stubUserId,
        encryptedKeys: stubKeyData.encryptedKeysString,
        publicKey: stubKeyData.publicKey,
        privateKey: stubKeyData.privateKey,
      })

      const response = await app.inject({
        method: 'DELETE',
        url: endpointRoute,
        cookies: {
          sessionId: sessionResponse.cookies[0].value,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ success: true })
      expect(response.statusCode).toEqual(StatusCodes.OK)

      const authRequest = await app.inject({
        method: 'GET',
        url: testAuthenticationRoute,
        cookies: {
          sessionId: sessionResponse.cookies[0].value,
        },
      })

      expect(authRequest.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })

    test('handles invalid session', async () => {
      const app = getApp()

      const response = await app.inject({
        method: 'DELETE',
        url: endpointRoute,
        cookies: {
          sessionId: 'some invalid session',
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })
  })
})
