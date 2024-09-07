import Fastify, { FastifyServerOptions } from 'fastify'
import swagger from '@fastify/swagger'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import swaggerUi from '@fastify/swagger-ui'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Server } from '@tus/server'
import { S3Store } from '@tus/s3-store'

import prismaPlugin from '../prisma/prismaPlugin'

import { API_ROOT, contentPathRoot, sessionKeyName } from './constants'
import * as routes from './routes'
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
      // NOTE: This needs to be disabled for integration tests because the
      // environment in which they run does not support HTTPS.
      secure: process.env.IS_INTEGRATION_TEST !== 'true',
      sameSite: 'none',
    },
  })

  const s3Store = new S3Store({
    partSize: 8 * 1024 * 1024, // Each uploaded part will have ~8MiB,
    s3ClientConfig: {
      bucket: (process.env.MINIO_DEFAULT_BUCKETS ?? '').split(',')[0],
      region: process.env.MINIO_SERVER_REGION ?? '',
      credentials: {
        accessKeyId: process.env.MINIO_SERVER_ACCESS_KEY ?? '',
        secretAccessKey: process.env.MINIO_SERVER_SECRET_KEY ?? '',
      },
    },
  })

  const tusServer = new Server({
    path: contentPathRoot,
    datastore: s3Store,
  })

  app.addContentTypeParser(
    'application/offset+octet-stream',
    (_request, _payload, done) => done(null)
  )

  app.all(contentPathRoot, (req, res) => {
    tusServer.handle(req.raw, res.raw)
  })

  app.all(`${contentPathRoot}/*`, (req, res) => {
    tusServer.handle(req.raw, res.raw)
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

  for (const route of Object.values(routes)) {
    await app.register(route, { prefix: `/${API_ROOT}/v1` })
  }

  return app
}
