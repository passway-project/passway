import { strict as assert } from 'node:assert'

import { FastifyPluginAsync } from 'fastify'
import httpErrors from 'http-errors'

import { StatusCodes } from 'http-status-codes'

import { S3Error } from 'minio'

import { contentBucketName, minioNoSuchKeyCode } from '../../../constants'

import { UploadService } from '../../../services/Upload'
import { isRecord } from '../../../types'

export const routeName = 'content'

export const contentRoute: FastifyPluginAsync<{ prefix: string }> = async (
  app,
  options
) => {
  const uploadService = new UploadService({
    app,
    path: `${options.prefix}/${routeName}`,
  })

  app.all(`/${routeName}`, uploadService.handleRequest)
  app.all(`/${routeName}/*`, uploadService.handleRequest)

  // NOTE: This is a minimal implementation of the content/list route. At the
  // moment it only serves to stand up just enough functionality to test
  // content uploading and downloading. It is not complete and will change
  // significantly.
  //
  // TODO: Implement pagination
  // TODO: Implement filtering
  app.get(
    `/${routeName}/list`,
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
            size: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        },
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
                  type: 'integer',
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
      const {
        query,
        session: { userId },
      } = request

      if (!isRecord(query)) {
        throw new TypeError()
      }

      const { page = 0, size = 0 } = query

      assert(typeof userId === 'number')
      assert(typeof page === 'number')
      assert(typeof size === 'number')

      const result = await app.prisma.fileMetadata.findMany({
        select: { contentId: true, contentSize: true, isEncrypted: true },
        where: {
          userId,
        },
        // FIXME: Test this
        skip: page * size,
        take: size,
      })

      return reply.send(result)
    }
  )

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

        if (e instanceof S3Error) {
          const { code } = e

          if (code === minioNoSuchKeyCode) {
            return reply.send(
              httpErrors.NotFound(`Content ID "${contentId}" not found`)
            )
          }
        }

        return reply.send(httpErrors.InternalServerError())
      }
    }
  )
}
