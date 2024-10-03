import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'vitest-mock-extended'

import { getApp } from '../../../../test/utils/getApp'
import { API_ROOT, sessionKeyName } from '../../../constants'

import {
  StubKeyData,
  getMockKeyData,
} from '../../../../test/utils/getMockKeyData'
import { requestAuthenticatedSession } from '../../../../test/utils/session'

import { UserGetApi, routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const stubUserId = 0
const stubPasskeyId = 'foo'
const stubUserPasskeySecret = 'abc123'
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
  iv: stubUserIvString,
  salt: stubUserSaltString,
  publicKey: stubKeyData.publicKey,
  createdAt: stubTimestamp,
  updatedAt: stubTimestamp,
}

beforeAll(async () => {
  Object.assign(
    stubKeyData,
    await getMockKeyData(stubUserPasskeySecret, stubIv, stubSalt)
  )

  preexistingUser.publicKey = stubKeyData.publicKey
  preexistingUser.encryptedKeys = stubKeyData.encryptedKeys
})

describe(endpointRoute, () => {
  describe('GET', () => {
    test('retrieves a user that exists', async () => {
      const app = getApp()

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)

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
          iv: preexistingUser.iv,
          keys: preexistingUser.encryptedKeys,
          salt: preexistingUser.salt,
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
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubKeyData.publicKey,
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
          encryptedKeys: stubKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: stubKeyData.publicKey,
          salt: stubUserSaltString,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.CREATED)
      expect(
        (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
      ).toHaveBeenCalledWith({
        create: {
          encryptedKeys: stubKeyData.encryptedKeys,
          iv: stubUserIvString,
          passkeyId: stubPasskeyId,
          publicKey: stubKeyData.publicKey,
          salt: stubUserSaltString,
        },
        update: {
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
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
        ...stubKeyData,
      })

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockResolvedValueOnce({
        id: stubUserId,
        passkeyId: stubPasskeyId,
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubKeyData.publicKey,
        iv: stubUserIvString,
        salt: stubUserSaltString,
        createdAt: stubTimestamp,
        updatedAt: new Date(Date.now() + 1000),
      })

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: stubKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: stubKeyData.publicKey,
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
          encryptedKeys: stubKeyData.encryptedKeys,
          iv: stubUserIvString,
          passkeyId: stubPasskeyId,
          publicKey: stubKeyData.publicKey,
          salt: stubUserSaltString,
        },
        update: {
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
        },
        where: {
          id: preexistingUser.id,
          passkeyId: stubPasskeyId,
        },
      })
    })

    test('rejects requests to update the wrong user', async () => {
      const app = getApp()

      const sessionResponse = await requestAuthenticatedSession(app, {
        userId: stubUserId + 1,
        ...stubKeyData,
      })

      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockResolvedValueOnce({
        id: stubUserId,
        passkeyId: stubPasskeyId,
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubKeyData.publicKey,
        iv: stubUserIvString,
        salt: stubUserSaltString,
        createdAt: stubTimestamp,
        updatedAt: new Date(Date.now() + 1000),
      })

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: stubKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: stubKeyData.publicKey,
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
      ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).user.upsert.mockRejectedValueOnce(new Error())

      const response = await app.inject({
        method: 'PUT',
        url: endpointRoute,
        body: {
          encryptedKeys: stubKeyData.encryptedKeys,
          id: stubPasskeyId,
          iv: stubUserIvString,
          publicKey: stubKeyData.publicKey,
          salt: stubUserSaltString,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ message: 'Permission denied' })
      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })
  })
})
