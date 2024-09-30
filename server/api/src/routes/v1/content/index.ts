import { FastifyPluginAsync } from 'fastify'
import httpErrors from 'http-errors'

import { StatusCodes } from 'http-status-codes'

import { contentBucketName } from '../../../constants'

import { TusService } from '../../../services/Tus'

export const routeName = 'content'

export const contentRoute: FastifyPluginAsync<{ prefix: string }> = async (
  app,
  options
) => {
  const tusService = new TusService({
    fastify: app,
    tusServerPath: `${options.prefix}/${routeName}`,
  })

  app.all(`/${routeName}`, tusService.pipeToTus)
  app.all(`/${routeName}/*`, tusService.pipeToTus)

  // NOTE: This is a minimal implementation of the content/list route. At the
  // moment it only serves to stand up just enough functionality to test
  // content uploading and downloading. It is not complete and will change
  // significantly.
  //
  // FIXME: Test this
  // TODO: Implement pagination
  // TODO: Implement filtering
  app.get(
    `/${routeName}/list`,
    {
      // TODO: Define schema
      schema: {
        response: {
          [StatusCodes.OK]: {
            description: 'Content found',
            type: 'array',
            items: {
              type: 'object',
              required: ['contentId', 'contentSize', 'isEncrypted'],
              properties: {
                contentId: {
                  type: 'string',
                },
                contentSize: {
                  type: 'number',
                },
                isEncrypted: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.session

      const result = await app.prisma.fileMetadata.findMany({
        select: { contentId: true, contentSize: true, isEncrypted: true },
        where: {
          userId,
        },
      })

      reply.send(result)
    }
  )

  // FIXME: Test this
  app.get<{ Params: { contentId: string } }>(
    `/${routeName}/:contentId`,
    {
      schema: {
        params: {
          contentId: {
            type: 'string',
          },
        },
        response: {
          [StatusCodes.OK]: {
            content: {
              'application/octet-stream': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { contentId } = request.params

      try {
        const objectDataStream = await app.minioClient.getObject(
          contentBucketName,
          contentId
        )

        reply.header('content-type', 'application/octet-stream')

        return reply.send(objectDataStream)
      } catch (e) {
        app.log.error(e, `Object ID ${contentId} lookup failed`)
        return reply.send(httpErrors.InternalServerError())
      }
    }
  )
}
