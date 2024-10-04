import { PrismaClient } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'vitest-mock-extended'

import { getApp } from '../../../../test/utils/getApp'
import { API_ROOT, sessionKeyName } from '../../../constants'
import { hydrateMockKeyData } from '../../../../test/utils/getMockKeyData'
import { requestAuthenticatedSession } from '../../../../test/utils/session'
import {
  getMockUser,
  stubKeyData,
  stubPasskeyId,
  stubTimestamp,
  stubUserId,
  stubUserIvString,
  stubUserSaltString,
} from '../../../../test/stubs'

import { UserGetApi, routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const mockKeyData = stubKeyData()
const mockUser = getMockUser(mockKeyData)

beforeAll(async () => {
  await hydrateMockKeyData(mockKeyData)

  mockUser.publicKey = mockKeyData.publicKey
  mockUser.encryptedKeys = mockKeyData.encryptedKeys
})

describe(endpointRoute, () => {
  describe('GET', () => {
    test('retrieves a user that exists', async () => {
      const app = getApp()

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(mockUser)

      const response = await app.inject({
        method: 'GET',
        url: endpointRoute,
        headers: {
          'x-passway-id': stubUserId,
        },
      })

      const bodyJson: UserGetApi['Reply'] = await response.json()

      expect(bodyJson).toEqual({
        user: {
          iv: mockUser.iv,
          keys: mockUser.encryptedKeys,
          salt: mockUser.salt,
        },
      })
      expect(response.statusCode).toEqual(StatusCodes.OK)
    })

    test('handles a request for a user that does not exist', async () => {
      const app = getApp()
      const passkeyId = 'foo'

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())

      const response = await app.inject({
        method: 'GET',
        url: endpointRoute,
        headers: {
          'x-passway-id': passkeyId,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ message: `User ID ${passkeyId} not found` })
      expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
    })
  })

  describe('PUT', () => {
    test('creates a user', async () => {
      const app = getApp()

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockResolvedValueOnce({
        id: stubUserId,
        encryptedKeys: mockKeyData.encryptedKeys,
        publicKey: mockKeyData.publicKey,
        iv: stubUserIvString,
        salt: stubUserSaltString,
        passkeyId: stubPasskeyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: mockKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: mockKeyData.publicKey,
          salt: stubUserSaltString,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.CREATED)
      expect(
        (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
      ).toHaveBeenCalledWith({
        create: {
          encryptedKeys: mockKeyData.encryptedKeys,
          iv: stubUserIvString,
          passkeyId: stubPasskeyId,
          publicKey: mockKeyData.publicKey,
          salt: stubUserSaltString,
        },
        update: {
          encryptedKeys: mockKeyData.encryptedKeys,
          publicKey: mockKeyData.publicKey,
        },
        where: {
          passkeyId: stubPasskeyId,
        },
      })
    })

    test('updates a user', async () => {
      const app = getApp()

      const sessionResponse = await requestAuthenticatedSession(app, {
        userId: stubUserId,
        ...mockKeyData,
      })

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(mockUser)
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockResolvedValueOnce({
        id: stubUserId,
        passkeyId: stubPasskeyId,
        encryptedKeys: mockKeyData.encryptedKeys,
        publicKey: mockKeyData.publicKey,
        iv: stubUserIvString,
        salt: stubUserSaltString,
        createdAt: stubTimestamp,
        updatedAt: new Date(Date.now() + 1000),
      })

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: mockKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: mockKeyData.publicKey,
          salt: stubUserSaltString,
        },
        cookies: {
          [sessionKeyName]: sessionResponse.cookies[0].value,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.OK)
      expect(
        (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
      ).toHaveBeenCalledWith({
        create: {
          encryptedKeys: mockKeyData.encryptedKeys,
          iv: stubUserIvString,
          passkeyId: stubPasskeyId,
          publicKey: mockKeyData.publicKey,
          salt: stubUserSaltString,
        },
        update: {
          encryptedKeys: mockKeyData.encryptedKeys,
          publicKey: mockKeyData.publicKey,
        },
        where: {
          id: mockUser.id,
          passkeyId: stubPasskeyId,
        },
      })
    })

    test('rejects requests to update the wrong user', async () => {
      const app = getApp()

      const sessionResponse = await requestAuthenticatedSession(app, {
        userId: stubUserId + 1,
        ...mockKeyData,
      })

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(mockUser)
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockResolvedValueOnce({
        id: stubUserId,
        passkeyId: stubPasskeyId,
        encryptedKeys: mockKeyData.encryptedKeys,
        publicKey: mockKeyData.publicKey,
        iv: stubUserIvString,
        salt: stubUserSaltString,
        createdAt: stubTimestamp,
        updatedAt: new Date(Date.now() + 1000),
      })

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: mockKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: mockKeyData.publicKey,
          salt: stubUserSaltString,
        },
        cookies: {
          [sessionKeyName]: sessionResponse.cookies[0].value,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ message: 'Permission denied' })
      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })

    test('prevents unauthorized updates', async () => {
      const app = getApp()

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(mockUser)
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockRejectedValueOnce(new Error())

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: mockKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: mockKeyData.publicKey,
          salt: stubUserSaltString,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ message: 'Permission denied' })
      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })
  })
})
