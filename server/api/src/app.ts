import Fastify, { FastifyServerOptions } from 'fastify'
import swagger from '@fastify/swagger'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import swaggerUi from '@fastify/swagger-ui'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import * as Minio from 'minio'

import { prismaPlugin } from '../prisma/prismaPlugin'

import { API_ROOT, containerName, sessionKeyName } from './constants'
import * as v1Routes from './routes/v1'
import { healthcheckRoute } from './routes/healthcheck'
import { sessionStore } from './sessionStore'
import { preHandlers } from './hooks/preHandler'

const theme = new SwaggerTheme()
const content = theme.getBuffer(SwaggerThemeNameEnum.DARK)

export const buildApp = async (options?: FastifyServerOptions) => {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
      level: process.env.MODE === 'production' ? 'info' : 'debug',
    },
    ...options,
  }).withTypeProvider<TypeBoxTypeProvider>()

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
    },
  })
  await app.register(prismaPlugin)
  await app.register(fastifyCors, {
    credentials: true,
    origin: true,
  })
  await app.register(fastifyCookie)
  await app.register(fastifySession, {
    secret: process.env.AUTH_SESSION_SECRET ?? '',
    store: sessionStore,
    cookieName: sessionKeyName,
    cookie: {
      // NOTE: This needs to be disabled for tests because the environment in
      // which they run does not support HTTPS.
      secure: process.env.MODE !== 'integration-test',
      sameSite: 'none',
    },
  })

  await app.register(async () => {
    const minioClient = new Minio.Client({
      endPoint: containerName.CONTENT_STORE,
      port: 9000,
      useSSL: false,
      accessKey: process.env.MINIO_SERVER_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SERVER_SECRET_KEY ?? '',
    })

    app.decorate('minioClient', minioClient)
  })

  await app.register(swaggerUi, {
    routePrefix: `/${API_ROOT}`,
    uiConfig: {
      docExpansion: 'full',
      deepLinking: true,
      tryItOutEnabled: true,
    },
    theme: {
      css: [{ filename: 'theme.css', content }],
    },
  })

  await app.register(preHandlers)
  await app.register(healthcheckRoute, {
    prefix: `/${API_ROOT}`,
    logLevel: 'silent',
  })

  for (const route of Object.values(v1Routes)) {
    await app.register(route, { prefix: `/${API_ROOT}/v1` })
  }

  return app
}
