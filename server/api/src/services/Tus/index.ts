import { IncomingMessage, ServerResponse } from 'http'

import { FastifyReply, FastifyRequest } from 'fastify'
import { Server } from '@tus/server'
import { S3Store } from '@tus/s3-store'
import { Prisma } from '@prisma/client'
import { FastifyInstance, Session } from 'fastify'
import { Upload } from '@tus/server'

import { containerName, sessionKeyName } from '../../constants'
import { sessionStore } from '../../sessionStore'

export class TusService {
  private app: FastifyInstance

  private tusServer: Server

  constructor({
    fastify,
    tusServerPath,
  }: {
    fastify: FastifyInstance
    tusServerPath: string
  }) {
    this.app = fastify

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

    this.tusServer = new Server({
      generateUrl: (_request, { host, id, path, proto }) => {
        return `${proto}://${host}:${process.env.API_PORT}${path}/${id}`
      },
      path: tusServerPath,
      datastore: s3Store,
      onUploadFinish: this.handleUploadFinish,
    })

    // NOTE: Needed for tus-node-server
    // https://github.com/tus/tus-node-server?tab=readme-ov-file#quick-start
    fastify.addContentTypeParser(
      'application/offset+octet-stream',
      async () => null
    )
  }

  pipeToTus = (request: FastifyRequest, reply: FastifyReply) => {
    this.tusServer.handle(request.raw, reply.raw)
  }

  handleUploadFinish = async (
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    upload: Upload
  ) => {
    this.app.log.debug(upload, 'Upload complete')

    const { [sessionKeyName]: sessionId } = this.app.parseCookie(
      request.headers.cookie ?? ''
    )

    let userId = -1

    try {
      userId = await new Promise<number>((resolve, reject) => {
        sessionStore.get(`${sessionId.split('.')[0]}`, (err, data: Session) => {
          if (err) {
            reject(err)
          }
          const { userId, authenticated } = data

          if (!authenticated || typeof userId !== 'number') {
            this.app.log.error(data, 'User is not authenticated')
            return reject(new Error('User is not authenticated'))
          }

          resolve(userId)
        })
      })
    } catch (e) {
      this.app.log.error(`Could not find data for session ID ${sessionId}`)
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
      const result =
        await this.app.prisma.fileMetadata.create(fileMetadataRecord)
      this.app.log.debug(result, 'Created file metadata record')
    } catch (e) {
      this.app.log.error(e, 'Could not record file metadata')
    }

    return response
  }
}
