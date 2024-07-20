import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'

import { getApp, testAuthenticationRoute } from '../../../../test/getApp'
import { API_ROOT, sessionKeyName } from '../../../constants'

import { getSignature } from '../../../../test/utils/crypto'
import { requestSession } from '../../../../test/utils/session'
import { StubKeyData, getStubKeyData } from '../../../../test/getStubKeyData'

import { routeName, signatureMessage } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const stubPasskeyId = 'foo'
const stubUserId = 0
const stubUserSecret = 'abc123'
const stubIv = crypto.getRandomValues(new Uint8Array(12))
const stubSalt = crypto.getRandomValues(new Uint8Array(16))
const stubUserIvString = Buffer.from(stubIv).toString('base64')
const stubUserSaltString = Buffer.from(stubSalt).toString('base64')

const stubKeyData: StubKeyData = {
  publicKey: '',
  privateKey: '',
  encryptedKeys: '',
}

const stubTimestamp = new Date(Date.now())
const preexistingUser: User = {
  id: stubUserId,
  passkeyId: stubPasskeyId,
  encryptedKeys: stubKeyData.encryptedKeys,
  publicKey: stubKeyData.publicKey,
  iv: stubUserIvString,
  salt: stubUserSaltString,
  createdAt: stubTimestamp,
  updatedAt: stubTimestamp,
}

const sessionCookie = {
  httpOnly: true,
  name: sessionKeyName,
  path: '/',
  secure: true,
  value: expect.any(String),
}

beforeAll(async () => {
  Object.assign(
    stubKeyData,
    await getStubKeyData(stubUserSecret, stubIv, stubSalt)
  )
})

describe(endpointRoute, () => {
  describe('GET', () => {
    test('handles nonexistent user lookup', async () => {
      const app = getApp()

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
          'x-passway-id': stubPasskeyId,
          'x-passway-signature': signatureHeader,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({
        message: `User ID ${stubPasskeyId} not found`,
      })
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })

    test('creates session for valid user authentication request', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
        userId: stubUserId,
        ...stubKeyData,
      })

      const authRequest = await app.inject({
        method: 'GET',
        url: testAuthenticationRoute,
        cookies: {
          [sessionKeyName]: sessionResponse.cookies[0].value,
        },
      })

      expect(sessionResponse.statusCode).toEqual(StatusCodes.OK)
      expect(sessionResponse.cookies).toContainEqual(sessionCookie)
      expect(authRequest.statusCode).toEqual(StatusCodes.OK)
    })

    test('handles incorrect signature message', async () => {
      const app = getApp()

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
          'x-passway-id': stubPasskeyId,
          'x-passway-signature': signatureHeader,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })

    test('handles invalid signature', async () => {
      const app = getApp()

      const differentSignatureKeys = await getStubKeyData(
        'some other secret',
        stubIv,
        stubSalt
      )

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
          'x-passway-id': stubPasskeyId,
          'x-passway-signature': signatureHeader,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ message: 'Invalid signature' })
      expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST)
      expect(response.cookies).not.toContainEqual(sessionCookie)
    })
  })

  describe('DELETE', () => {
    test('deletes a session', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
        userId: stubUserId,
        ...stubKeyData,
      })

      const response = await app.inject({
        method: 'DELETE',
        url: endpointRoute,
        cookies: {
          [sessionKeyName]: sessionResponse.cookies[0].value,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.OK)

      const authRequest = await app.inject({
        method: 'GET',
        url: testAuthenticationRoute,
        cookies: {
          [sessionKeyName]: sessionResponse.cookies[0].value,
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
          [sessionKeyName]: 'some invalid session',
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })
  })
})
