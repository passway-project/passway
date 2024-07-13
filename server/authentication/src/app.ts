import Fastify, { FastifyServerOptions } from 'fastify'
import swagger from '@fastify/swagger'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import swaggerUi from '@fastify/swagger-ui'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { API_ROOT } from './constants'
import * as routes from './routes/index'
import prismaPlugin from '../prisma/prismaPlugin'
import { sessionStore } from './sessionStore'
import { setupPrehandler } from './hooks/preHandler'

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

  await app.register(swagger)
  await app.register(prismaPlugin)
  await app.register(fastifyCookie)
  await app.register(fastifySession, {
    secret: process.env.AUTH_SESSION_SECRET ?? '',
    store: sessionStore,
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

  setupPrehandler(app)

  for (const route of Object.values(routes)) {
    await app.register(route, { prefix: `/${API_ROOT}/v1` })
  }

  return app
}
