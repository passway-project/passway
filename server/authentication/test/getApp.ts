import fastify, { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { mockDeep } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

jest.mock('../src/sessionStore')

let app: FastifyInstance = fastify()

export const testAuthenticationRoute = '/authenticated'

beforeAll(async () => {
  app = await buildApp({ logger: false })
  app.prisma = mockDeep<PrismaClient>()

  // NOTE: Test route to validate authentication status
  app.get(testAuthenticationRoute, async (req, res) => {
    if (req.session.authenticated) {
      res.code(StatusCodes.OK)
    } else {
      res.code(StatusCodes.FORBIDDEN)
    }
  })
})

afterAll(() => {
  app.close()
})

export const getApp = () => {
  return app
}
