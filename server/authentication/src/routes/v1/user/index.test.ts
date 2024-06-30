import fastify, { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { buildApp } from '../../../app'
import { API_ROOT } from '../../../constants'

// FIXME: Move this to a setup file
let app: FastifyInstance = fastify()

beforeEach(async () => {
  app = await buildApp()
  app.prisma = mockDeep<PrismaClient>()
})

afterEach(async () => {
  app.close()
})

const endpointRoute = `/${API_ROOT}/v1/user`

// FIXME: Silence logs for tests

describe(endpointRoute, () => {
  test('creates a user', async () => {
    const passkeyId = 'foo'

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())
    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.upsert.mockResolvedValueOnce({ id: 0, passkeyId })

    const response = await app.inject({
      method: 'PUT',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })
    expect(response.statusCode).toEqual(StatusCodes.CREATED)
  })
})
