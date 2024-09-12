import { Client } from 'minio'

declare module 'fastify' {
  interface FastifyInstance {
    minioClient: Client
  }
}
