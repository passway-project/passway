import { FastifyInstance, HTTPMethods } from 'fastify'
import httpErrors from 'http-errors'

import { routeName as userRouteName } from '../routes/v1/user'
import { routeName as sessionRouteName } from '../routes/v1/session'
import { API_ROOT } from '../constants'

type publicEndpointRoute = `/${typeof API_ROOT}/v1/${string}`

const publicEndpoints: Record<publicEndpointRoute, Set<HTTPMethods>> = {
  [`/${API_ROOT}/v1/${userRouteName}`]: new Set(['GET', 'PUT']),
  [`/${API_ROOT}/v1/${sessionRouteName}`]: new Set(['GET']),
}

const isPublicEndpointRoute = (route: string): route is publicEndpointRoute => {
  return route in publicEndpoints
}

const rSwaggerRoutes = new RegExp(
  [
    `^favicon.ico`,
    `^/${API_ROOT}$`,
    `^/${API_ROOT}/static/*`,
    `^/${API_ROOT}/json`,
  ].join('|')
)

const rejectUnauthorizedRequests = (app: FastifyInstance) => {
  app.addHook('preHandler', async (request, reply) => {
    const { url } = request

    // NOTE: Skips authentication checks for Swagger routes
    if (url.match(rSwaggerRoutes)) {
      return
    }

    if (isPublicEndpointRoute(url)) {
      if (publicEndpoints[url]?.has(request.method as HTTPMethods)) {
        return
      }
    }

    if (!request.session.authenticated) {
      reply.send(httpErrors.Forbidden())
    }
  })
}

export const setupPrehandler = (app: FastifyInstance) => {
  rejectUnauthorizedRequests(app)
}
