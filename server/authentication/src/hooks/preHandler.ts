import { FastifyInstance, HTTPMethods } from 'fastify'
import { routeName as userRouteName } from '../routes/v1/user'
import { routeName as sessionRouteName } from '../routes/v1/session'
import { API_ROOT } from '../constants'
import { StatusCodes } from 'http-status-codes'

type publicEndpointRoute = `/${typeof API_ROOT}/v1/${string}`

const publicEndpoints: Record<publicEndpointRoute, Set<HTTPMethods>> = {
  [`/${API_ROOT}/v1/${userRouteName}`]: new Set(['GET', 'PUT']),
  [`/${API_ROOT}/v1/${sessionRouteName}`]: new Set(['GET']),
}

const isPublicEndpointRoute = (route: string): route is publicEndpointRoute => {
  return route in publicEndpoints
}

const rejectUnauthorizedRequests = (app: FastifyInstance) => {
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
}

export const setupPrehandler = (app: FastifyInstance) => {
  rejectUnauthorizedRequests(app)
}
