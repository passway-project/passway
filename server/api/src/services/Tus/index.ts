import { IncomingMessage, ServerResponse } from 'http'

import { Prisma } from '@prisma/client'
import { FastifyInstance, Session } from 'fastify'
import { Upload } from '@tus/server'

import { sessionKeyName } from '../../constants'
import { sessionStore } from '../../sessionStore'

export class TusService {
  private app: FastifyInstance

  constructor(app: FastifyInstance) {
    this.app = app
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
