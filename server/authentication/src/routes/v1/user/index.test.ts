import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'
import { routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const stubUserId = 0
const stubUserEncryptedKeysData = 'ZW5jcnlwdGVkIGtleQo='
const stubUserPublicKeyData = 'cHVibGljIGtleQo='

describe(endpointRoute, () => {
  test('creates a user', async () => {
    const app = getApp()
    const passkeyId = 'foo'

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())
    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.upsert.mockResolvedValueOnce({
      id: stubUserId,
      encryptedKeys: stubUserEncryptedKeysData,
      publicKey: stubUserPublicKeyData,
      passkeyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await app.inject({
      method: 'PUT',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })
    expect(response.statusCode).toEqual(StatusCodes.CREATED)
    expect(
      (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
    ).toHaveBeenCalledWith({
      create: {
        passkeyId,
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
      },
      update: {
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
      },
      where: {
        passkeyId,
      },
    })
  })

  test('updates a user', async () => {
    const app = getApp()
    const now = Date.now()
    const passkeyId = 'foo'
    const preexistingUser: User = {
      id: stubUserId,
      passkeyId,
      encryptedKeys: stubUserEncryptedKeysData,
      publicKey: stubUserPublicKeyData,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)
    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.upsert.mockResolvedValueOnce({
      id: stubUserId,
      passkeyId,
      encryptedKeys: stubUserEncryptedKeysData,
      publicKey: stubUserPublicKeyData,
      createdAt: new Date(now),
      updatedAt: new Date(now + 1000),
    })

    const response = await app.inject({
      method: 'PUT',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })
    expect(response.statusCode).toEqual(StatusCodes.OK)
    expect(
      (app.prisma as DeepMockProxy<PrismaClient>).user.upsert
    ).toHaveBeenCalledWith({
      create: {
        passkeyId,
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
      },
      update: {
        encryptedKeys: stubUserEncryptedKeysData,
        publicKey: stubUserPublicKeyData,
      },
      where: {
        id: preexistingUser.id,
        passkeyId,
      },
    })
  })

  test('reports INTERNAL_SERVER_ERROR', async () => {
    const app = getApp()
    const now = Date.now()
    const passkeyId = 'foo'
    const preexistingUser: User = {
      id: stubUserId,
      passkeyId,
      encryptedKeys: stubUserEncryptedKeysData,
      publicKey: stubUserPublicKeyData,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)
    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.upsert.mockRejectedValueOnce(new Error())

    const response = await app.inject({
      method: 'PUT',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: false })
    expect(response.statusCode).toEqual(StatusCodes.INTERNAL_SERVER_ERROR)
  })
})
