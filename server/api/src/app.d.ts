import { Client } from 'minio'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }

  interface FastifyInstance {
    minioClient: Client
  }

  interface Session {
    authenticated?: boolean
    userId?: User['id']
  }
}
