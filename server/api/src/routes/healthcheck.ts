import { FastifyPluginAsync } from 'fastify'

export const routeName = 'healthcheck'

export const healthcheckRoute: FastifyPluginAsync = async app => {
  app.get(
    `/${routeName}`,
    {
      schema: {
        summary: 'Indicates whether the service is up and healthy',
      },
    },
    async () => {
      return
    }
  )
}
