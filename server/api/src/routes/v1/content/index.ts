import { FastifyPluginAsync, Session } from 'fastify'
import { Server } from '@tus/server'
import { S3Store } from '@tus/s3-store'
import { Prisma } from '@prisma/client'
import httpErrors from 'http-errors'

import { StatusCodes } from 'http-status-codes'

import {
  containerName,
  contentBucketName,
  sessionKeyName,
} from '../../../constants'
import { sessionStore } from '../../../sessionStore'

export const routeName = 'content'

export const contentRoute: FastifyPluginAsync<{ prefix: string }> = async (
  app,
  options
) => {
  const s3Store = new S3Store({
    partSize: 8 * 1024 * 1024, // Each uploaded part will have ~8MiB,
    s3ClientConfig: {
      forcePathStyle: true,
      endpoint: `http://${containerName.CONTENT_STORE}:9000`,
      bucket: (process.env.MINIO_DEFAULT_BUCKETS ?? '').split(',')[0],
      region: process.env.MINIO_SERVER_REGION ?? '',
      credentials: {
        accessKeyId: process.env.MINIO_SERVER_ACCESS_KEY ?? '',
        secretAccessKey: process.env.MINIO_SERVER_SECRET_KEY ?? '',
      },
    },
  })

  const tusServer = new Server({
    generateUrl: (_request, { host, id, path, proto }) => {
      return `${proto}://${host}:${process.env.API_PORT}${path}/${id}`
    },
    path: `${options.prefix}/${routeName}`,
    datastore: s3Store,
    onUploadFinish: async (request, response, upload) => {
      app.log.debug(upload, 'Upload complete')
      const { [sessionKeyName]: sessionId } = app.parseCookie(
        request.headers.cookie ?? ''
      )

      let userId = -1

      try {
        userId = await new Promise<number>((resolve, reject) => {
          sessionStore.get(
            `${sessionId.split('.')[0]}`,
            (err, data: Session) => {
              if (err) {
                reject(err)
              }
              const { userId, authenticated } = data

              if (!authenticated || typeof userId !== 'number') {
                app.log.error(data, 'User is not authenticated')
                return reject(new Error('User is not authenticated'))
              }

              resolve(userId)
            }
          )
        })
      } catch (e) {
        app.log.error(`Could not find data for session ID ${sessionId}`)
      }

      const { size: contentSize, metadata: { isEncrypted } = {} } = upload

      if (typeof contentSize !== 'number') {
        throw new TypeError(
          `contentSize must be a number. Received: ${typeof contentSize}`
        )
      }

      if (!['0', '1'].includes(isEncrypted ?? '')) {
        throw new TypeError(
          `metadata.isEncrypted must be either "0" or "1". Received: ${isEncrypted}, (${typeof isEncrypted})`
        )
      }

      const fileMetadataRecord: Prisma.FileMetadataCreateArgs = {
        data: {
          contentId: upload.id,
          contentSize,
          userId,
          isEncrypted: isEncrypted === '1',
        },
      }

      try {
        const result = await app.prisma.fileMetadata.create(fileMetadataRecord)
        app.log.debug(result, 'Created file metadata record')
      } catch (e) {
        app.log.error(e, 'Could not record file metadata')
      }

      return response
    },
  })

  // NOTE: Needed for tus-node-server
  // https://github.com/tus/tus-node-server?tab=readme-ov-file#quick-start
  app.addContentTypeParser('application/offset+octet-stream', async () => null)

  app.all(`/${routeName}`, (request, reply) => {
    tusServer.handle(request.raw, reply.raw)
  })

  app.all(`/${routeName}/*`, (request, reply) => {
    tusServer.handle(request.raw, reply.raw)
  })

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
