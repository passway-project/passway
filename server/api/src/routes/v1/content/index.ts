import { FastifyPluginAsync } from 'fastify'
import httpErrors from 'http-errors'

import { StatusCodes } from 'http-status-codes'

import { S3Error } from 'minio'

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

import {
  contentBucketName,
  minioNoSuchKeyCode,
  prismaNotFoundCode,
} from '../../../constants'

import { UploadService } from '../../../services/Upload'

export const routeName = 'content'

export const contentRoute: FastifyPluginAsync<{ prefix: string }> = async (
  app,
  options
) => {
  const uploadService = new UploadService({
    app,
    path: `${options.prefix}/${routeName}`,
  })

  // FIXME: Make uploads upsert operations
  app.all(`/${routeName}`, uploadService.handleRequest)
  app.all(`/${routeName}/*`, uploadService.handleRequest)

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
      const {
        params: { contentId },
        session: { userId },
      } = request

      try {
        const { contentObjectId } =
          await app.prisma.fileMetadata.findFirstOrThrow({
            select: {
              contentObjectId: true,
            },
            where: {
              userId,
              contentId,
            },
          })

        const objectDataStream = await app.minioClient.getObject(
          contentBucketName,
          contentObjectId
        )

        reply.header('content-type', 'application/octet-stream')

        return reply.send(objectDataStream)
      } catch (e) {
        app.log.error(e, `Content retrieval for "${contentId}" failed`)

        let recordFound = true

        if (e instanceof PrismaClientKnownRequestError) {
          if (e.code === prismaNotFoundCode) {
            recordFound = false
          }
        }

        if (e instanceof S3Error) {
          if (e.code === minioNoSuchKeyCode) {
            recordFound = false
          }
        }

        if (!recordFound) {
          return reply.send(
            httpErrors.NotFound(`Content retrieval for "${contentId}" failed`)
          )
        }

        return reply.send(httpErrors.InternalServerError())
      }
    }
  )
}
