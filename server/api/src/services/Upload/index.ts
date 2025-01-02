import { IncomingMessage, ServerResponse } from 'http'

import { FastifyReply, FastifyRequest } from 'fastify'
import { Server } from '@tus/server'
import { S3Store } from '@tus/s3-store'
import { Prisma } from '@prisma/client'
import { FastifyInstance, Session } from 'fastify'
import { Upload } from '@tus/server'

import { StatusCodes } from 'http-status-codes'

import { containerName, sessionKeyName } from '../../constants'
import { sessionStore } from '../../sessionStore'

export class UploadError extends Error {
  body: string
  status_code: number

  constructor(message: string, statusCode: number) {
    super(`[${statusCode}] ${message}`)
    this.body = message
    this.status_code = statusCode
  }
}

const offsetOctetStreamParserName = 'application/offset+octet-stream'

export class UploadService {
  private app: FastifyInstance

  private server: Server

  constructor({
    app,
    path,
    ServerImpl,
  }: {
    app: FastifyInstance
    path: string
    ServerImpl?: Server
  }) {
    this.app = app

    // NOTE: This check is needed to avoid redefining the content type parser
    // in the test environment
    if (!app.hasContentTypeParser(offsetOctetStreamParserName)) {
      // NOTE: Needed for tus-node-server
      // https://github.com/tus/tus-node-server?tab=readme-ov-file#quick-start
      app.addContentTypeParser(offsetOctetStreamParserName, async () => null)
    }

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

    this.server =
      ServerImpl ??
      new Server({
        generateUrl: (_request, { host, id, path, proto }) => {
          return process.env.MODE === 'integration-test'
            ? /* c8 ignore next */
              `${proto}://${host}${path}/${id}`
            : `${proto}://${host}:${process.env.API_PORT}${path}/${id}`
        },
        path,
        datastore: s3Store,
        onUploadCreate: this.handleUploadCreate,
        onUploadFinish: this.handleUploadFinish,
        allowedCredentials: true,
      })
  }

  handleRequest = (request: FastifyRequest, reply: FastifyReply) => {
    this.server.handle(request.raw, reply.raw)
  }

  handleUploadCreate = async (
    _request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    upload: Upload
  ) => {
    const { metadata: { id: contentId } = {} } = upload

    if (typeof contentId !== 'string') {
      throw new UploadError('Content ID not provided', StatusCodes.BAD_REQUEST)
    }

    return response
  }

  handleUploadFinish = async (
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    upload: Upload
  ) => {
    try {
      this.app.log.debug(upload, 'Upload complete')

      const { [sessionKeyName]: sessionId } = this.app.parseCookie(
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
                return reject(new Error('User is not authenticated'))
              }

              resolve(userId)
            }
          )
        })
      } catch (e) {
        throw new UploadError(
          `Could not find data for session ID ${sessionId}`,
          StatusCodes.FORBIDDEN
        )
      }

      const { size: contentSize, metadata: { id: contentId } = {} } = upload

      if (typeof contentId !== 'string') {
        throw new UploadError(
          'Content ID not provided',
          StatusCodes.BAD_REQUEST
        )
      }

      if (typeof contentSize !== 'number') {
        throw new UploadError(
          `contentSize must be a number. Received: ${typeof contentSize}`,
          StatusCodes.BAD_REQUEST
        )
      }

      const fileMetadataRecord: Prisma.FileMetadataCreateArgs = {
        data: {
          contentObjectId: upload.id,
          contentId,
          contentSize,
          userId,
        },
      }

      try {
        const preexistingFileMetadataRecords =
          await this.app.prisma.fileMetadata.findMany({
            select: { id: true, contentObjectId: true },
            where: {
              userId,
              contentId,
            },
          })

        const preexistingFileMedatadataRecordIds =
          preexistingFileMetadataRecords.map(({ id }) => id)

        const result =
          await this.app.prisma.fileMetadata.create(fileMetadataRecord)

        this.app.log.debug(result, 'Created file metadata record')

        await this.app.prisma.fileMetadata.deleteMany({
          where: {
            id: {
              in: preexistingFileMedatadataRecordIds,
            },
          },
        })

        const preexistingContentObjectIds = preexistingFileMetadataRecords.map(
          ({ contentObjectId }) => contentObjectId
        )

        await Promise.all(
          preexistingContentObjectIds.map(contentObjectId => {
            return this.server.datastore.remove(contentObjectId)
          })
        )

        this.app.log.debug(
          preexistingFileMetadataRecords,
          `Deleted previous versions of contentId ${contentId} for userId ${userId}`
        )
      } catch (e) {
        this.app.log.error(`Could not record file metadata: ${e}`)

        throw new UploadError(
          'Could not record file metadata',
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      }
    } catch (e) {
      this.app.log.error(e)
      throw e
    }

    return response
  }
}
