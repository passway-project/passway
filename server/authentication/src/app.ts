import Fastify, { FastifyServerOptions, HTTPMethods } from 'fastify'
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
import { StatusCodes } from 'http-status-codes'
import { routeName as userRouteName } from './routes/v1/user'
import { routeName as sessionRouteName } from './routes/v1/session'

const theme = new SwaggerTheme()
const content = theme.getBuffer(SwaggerThemeNameEnum.DARK)

type publicEndpointRoute = `/${typeof API_ROOT}/v1/${string}`

const publicEndpoints: Record<publicEndpointRoute, Set<HTTPMethods>> = {
  [`/${API_ROOT}/v1/${userRouteName}`]: new Set(['GET', 'PUT']),
  [`/${API_ROOT}/v1/${sessionRouteName}`]: new Set(['GET']),
}

const isPublicEndpointRoute = (route: string): route is publicEndpointRoute => {
  return route in publicEndpoints
}

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

  app.addHook('preHandler', async (request, reply) => {
    const { url } = request

    if (isPublicEndpointRoute(url)) {
      if (publicEndpoints[url]?.has(request.method as HTTPMethods)) {
        return
      }
    }

    if (!request.session.authenticated) {
      // TODO: Return a custom error instead
      reply.code(StatusCodes.FORBIDDEN)
      reply.send({ success: false })
    }
  })

  for (const route of Object.values(routes)) {
    await app.register(route, { prefix: `/${API_ROOT}/v1` })
  }

  return app
}
