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

  constructor({ app, path }: { app: FastifyInstance; path: string }) {
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

    this.server = new Server({
      generateUrl: (_request, { host, id, path, proto }) =>
        `${proto}://${host}:${process.env.API_PORT}${path}/${id}`,
      path,
      datastore: s3Store,
      onUploadFinish: this.handleUploadFinish,
    })
  }

  handleRequest = (request: FastifyRequest, reply: FastifyReply) => {
    this.server.handle(request.raw, reply.raw)
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

      const { size: contentSize, metadata: { isEncrypted } = {} } = upload

      if (typeof contentSize !== 'number') {
        throw new UploadError(
          `contentSize must be a number. Received: ${typeof contentSize}`,
          StatusCodes.BAD_REQUEST
        )
      }

      if (!['0', '1'].includes(isEncrypted ?? '')) {
        throw new UploadError(
          `metadata.isEncrypted must be either "0" or "1" (string). Received: ${isEncrypted} (${typeof isEncrypted})`,
          StatusCodes.BAD_REQUEST
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
        const result =
          await this.app.prisma.fileMetadata.create(fileMetadataRecord)
        this.app.log.debug(result, 'Created file metadata record')
      } catch (e) {
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
