import { FastifyPluginAsync } from 'fastify'

export const routeName = 'download'

export const downloadRoute: FastifyPluginAsync = async app => {
  // FIXME: Implement this
  app.get(`/${routeName}`, {}, async () => {})
}
