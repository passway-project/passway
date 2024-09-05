import Fastify, { FastifyServerOptions } from 'fastify'
import swagger from '@fastify/swagger'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import swaggerUi from '@fastify/swagger-ui'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import prismaPlugin from '../prisma/prismaPlugin'

import { API_ROOT, sessionKeyName } from './constants'
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
  await app.register(fastifyCookie)
  await app.register(fastifyCors, {
    credentials: true,
    origin: true,
  })
  await app.register(fastifySession, {
    secret: process.env.AUTH_SESSION_SECRET ?? '',
    store: sessionStore,
    cookieName: sessionKeyName,
    cookie: {
      // NOTE: This needs to be disabled for integration tests because the
      // environment in which they run does not support HTTPS.
      secure: process.env.IS_INTEGRATION_TEST !== 'true',
    },
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
