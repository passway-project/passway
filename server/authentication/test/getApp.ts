import { FastifyRedis } from '@fastify/redis'
import fastify, { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { mockDeep } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

jest.mock('@fastify/redis', () => ({
  __esModule: true,
  default: async () => {},
}))

jest.mock('ioredis')

let app: FastifyInstance = fastify()

beforeAll(async () => {
  app = await buildApp({ logger: false })
  app.prisma = mockDeep<PrismaClient>()
  app.redis = mockDeep<FastifyRedis>()
})

afterAll(() => {
  app.close()
})

export const getApp = () => {
  return app
}
