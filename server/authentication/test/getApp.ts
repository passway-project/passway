import fastify, { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { mockDeep } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

jest.mock('../src/sessionStore')

let app: FastifyInstance = fastify()

beforeAll(async () => {
  app = await buildApp({ logger: false })
  app.prisma = mockDeep<PrismaClient>()
})

afterAll(() => {
  app.close()
})

export const getApp = () => {
  return app
}
