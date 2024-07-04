import { FastifyRedis } from '@fastify/redis'
import fastify, { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { mockDeep } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

let app: FastifyInstance = fastify()
let redis: FastifyRedis | null = null

beforeAll(async () => {
  app = await buildApp({ logger: false })
  app.prisma = mockDeep<PrismaClient>()
  redis = app.redis
  app.redis = mockDeep<FastifyRedis>()
})

afterAll(() => {
  app.close()
  redis?.quit()
})

export const getApp = () => {
  return app
}
