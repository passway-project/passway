import { PrismaClient } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'vitest-mock-extended'

import { getApp, testAuthenticationRoute } from '../../../../test/utils/getApp'
import { API_ROOT, sessionKeyName } from '../../../constants'
import { getSignature } from '../../../../test/utils/crypto'
import { requestAuthenticatedSession } from '../../../../test/utils/session'
import {
  getMockKeyData,
  hydrateMockKeyData,
} from '../../../../test/utils/getMockKeyData'
import {
  getStubUser,
  stubKeyData,
  stubIv,
  stubPasskeyId,
  stubSalt,
  stubUserId,
} from '../../../../test/stubs'

import { routeName, signatureMessage } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const mockKeyData = stubKeyData()
const mockUser = getStubUser()

const sessionCookie = {
  httpOnly: true,
  name: sessionKeyName,
  path: '/',
  sameSite: 'None',
  secure: true,
  value: expect.any(String),
}

beforeAll(async () => {
  await hydrateMockKeyData(mockKeyData)
})

describe(endpointRoute, () => {
  describe('GET', () => {
    test('handles nonexistent user lookup', async () => {
      const app = getApp()

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())

      const signature = await getSignature(signatureMessage, {
        privateKey: mockKeyData.privateKey,
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

      const sessionResponse = await requestAuthenticatedSession(app, {
        userId: stubUserId,
        ...mockKeyData,
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
        privateKey: mockKeyData.privateKey,
      })

      const signatureHeader = Buffer.from(signature).toString('base64')

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(mockUser)

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

      const differentSignatureKeys = await getMockKeyData(
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
      ).user.findFirstOrThrow.mockResolvedValueOnce(mockUser)

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

      const sessionResponse = await requestAuthenticatedSession(app, {
        userId: stubUserId,
        ...mockKeyData,
      })

      const response = await app.inject({
        method: 'DELETE',
        url: endpointRoute,
        cookies: {
          [sessionKeyName]: sessionResponse.cookies[0].value,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.OK)
      expect(response.cookies).toEqual([
        {
          expires: new Date(0),
          httpOnly: true,
          name: sessionKeyName,
          path: '/',
          sameSite: 'None',
          secure: true,
          value: expect.any(String),
        },
      ])

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
