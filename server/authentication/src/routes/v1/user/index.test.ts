import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'

const endpointRoute = `/${API_ROOT}/v1/user`

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
      id: 0,
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
      },
      update: {},
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
      id: 0,
      passkeyId,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)
    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.upsert.mockResolvedValueOnce({
      id: 0,
      passkeyId,
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
      },
      update: {},
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
      id: 0,
      passkeyId,
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
