import { HTTPMethods } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import httpErrors from 'http-errors'

import { routeName as healthcheckRouteName } from '../routes/healthcheck'
import { routeName as userRouteName } from '../routes/v1/user'
import { routeName as sessionRouteName } from '../routes/v1/session'
import { API_ROOT } from '../constants'

type publicEndpointRoute =
  | `/${typeof API_ROOT}/v1/${string}`
  | `/${typeof API_ROOT}/${typeof healthcheckRouteName}`

const publicEndpoints: Record<publicEndpointRoute, Set<HTTPMethods>> = {
  [`/${API_ROOT}/${healthcheckRouteName}`]: new Set(['GET']),
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

export const preHandlers = fastifyPlugin(async app => {
  // NOTE: Rejects unauthorized requests
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
})
