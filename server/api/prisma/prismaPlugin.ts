import fastifyPlugin from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

// NOTE: Adapted from https://www.prisma.io/fastify

// Use TypeScript module augmentation to declare the type of server.prisma to be PrismaClient
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin = fastifyPlugin(async server => {
  const prisma = new PrismaClient()

  await prisma.$connect()

  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate('prisma', prisma)

  server.addHook('onClose', async server => {
    await server.prisma.$disconnect()
  })
})

export default prismaPlugin
