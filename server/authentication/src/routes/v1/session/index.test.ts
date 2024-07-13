import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp, testAuthenticationRoute } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'
import { routeName, signatureMessage } from '.'
import { getKeypair } from '../../../../test/getKeypair'
import { signatureKeyParams } from '../../../services/Encryption'
import {
  deriveKey,
  getSignature,
  importKey,
} from '../../../../test/utils/crypto'
import { requestSession } from '../../../../test/utils/session'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const stubUserId = 0
const stubUserPasskeySecret = 'abc123'
let stubUserEncryptedKeysData = ''
let stubUserPublicKeyData = ''
let stubUserPrivateKeyData = ''

const sessionCookie = {
  httpOnly: true,
  name: 'sessionId',
  path: '/',
  secure: true,
  value: expect.any(String),
}

beforeAll(async () => {
  const encryptionKeys = await getKeypair()
  const signatureKeys = await getKeypair(signatureKeyParams)

  stubUserPublicKeyData = signatureKeys.publicKey
  stubUserPrivateKeyData = signatureKeys.privateKey

  const keysString = JSON.stringify({
    encryptionKeys,
    signatureKeys,
  })

  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const importedKey = await importKey(stubUserPasskeySecret)
  const derivedKey = await deriveKey(importedKey, salt)

  const encryptedKeys = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    derivedKey,
    encoder.encode(keysString)
  )

  const encryptedKeysString = Buffer.from(encryptedKeys).toString('base64')

  stubUserEncryptedKeysData = encryptedKeysString
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
        privateKey: stubUserPrivateKeyData,
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

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ success: false })
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })

    test('creates session for valid user authentication request', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
        userId: stubUserId,
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
        privateKey: stubUserPrivateKeyData,
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
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }

      const signature = await getSignature('some other message', {
        privateKey: stubUserPrivateKeyData,
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

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ success: false })
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
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
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

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ success: false })
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })
  })

  describe('DELETE', () => {
    test('deletes a session', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
        userId: stubUserId,
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
        privateKey: stubUserPrivateKeyData,
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
