import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'

import { getApp } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'

import { StubKeyData, getStubKeyData } from '../../../../test/getStubKeyData'
import { requestSession } from '../../../../test/utils/session'

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
    await getStubKeyData(stubUserPasskeySecret, stubIv, stubSalt)
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
          'x-user-id': stubUserId,
        },
      })

      const bodyJson: UserGetApi['Reply'] = await response.json()

      expect(bodyJson).toEqual({
        user: {
          iv: preexistingUser.iv,
          keys: preexistingUser.encryptedKeys,
          publicKey: preexistingUser.publicKey,
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
          'x-user-id': passkeyId,
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
          id: stubPasskeyId,
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.CREATED)
      expect(
        (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
      ).toHaveBeenCalledWith({
        create: {
          passkeyId: stubPasskeyId,
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
          iv: expect.any(String),
          salt: expect.any(String),
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

      const sessionResponse = await requestSession(app, {
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
          id: stubPasskeyId,
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
        },
        cookies: {
          sessionId: sessionResponse.cookies[0].value,
        },
      })

      expect(response.statusCode).toEqual(StatusCodes.OK)
      expect(
        (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
      ).toHaveBeenCalledWith({
        create: {
          passkeyId: stubPasskeyId,
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
          iv: expect.any(String),
          salt: expect.any(String),
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

    test('rejects requests to update another user', async () => {
      const app = getApp()

      const sessionResponse = await requestSession(app, {
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
          id: stubPasskeyId,
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
        },
        cookies: {
          sessionId: sessionResponse.cookies[0].value,
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
          id: stubPasskeyId,
          encryptedKeys: stubKeyData.encryptedKeys,
          publicKey: stubKeyData.publicKey,
        },
      })

      const bodyJson = await response.json()

      expect(bodyJson).toEqual({ message: 'Permission denied' })
      expect(response.statusCode).toEqual(StatusCodes.FORBIDDEN)
    })
  })
})
