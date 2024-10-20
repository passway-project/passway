import { IncomingMessage, ServerResponse } from 'http'
import { Socket } from 'net'

import { Upload } from '@tus/server'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

import { sessionKeyName } from '../../constants'
import { sessionStore } from '../../__mocks__/sessionStore'
import { getApp } from '../../../test/utils/getApp'

import { UploadService } from '.'

const stubUserId = 1
const stubSessionId = 'session-id'
const stubContentId = 'abc123'
const stubContentSize = 1024
const stubFileMetadataRecordId = 1

describe('UploadService', () => {
  describe('handleUploadFinish', () => {
    test('creates FileMetadata record upon success', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.create.mockResolvedValueOnce({
        contentId: stubContentId,
        contentSize: stubContentSize,
        createdAt: new Date(),
        id: stubFileMetadataRecordId,
        isEncrypted: true,
        userId: stubUserId,
      })

      vi.spyOn(app.prisma.fileMetadata, 'create')

      vi.spyOn(sessionStore, 'get').mockImplementationOnce(
        (_sessionId, callback) => {
          callback(null, {
            cookie: {
              originalMaxAge: null,
            },
            authenticated: true,
            userId: stubUserId,
          })
        }
      )

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentId,
        offset: 0,
        size: stubContentSize,
        metadata: {
          isEncrypted: '1',
        },
      })

      const response = await uploadService.handleUploadFinish(
        stubIncomingMessage,
        stubServerResponse,
        stubUpload
      )

      expect(response.statusCode).toEqual(StatusCodes.OK)

      expect(app.prisma.fileMetadata.create).toHaveBeenCalledWith({
        data: {
          contentId: stubContentId,
          contentSize: stubContentSize,
          userId: stubUserId,
          isEncrypted: true,
        },
      })
    })

    test('handles missing session data', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })

      vi.spyOn(sessionStore, 'get').mockImplementationOnce(
        (_sessionId, callback) => {
          callback('session not found', {
            cookie: {
              originalMaxAge: null,
            },
          })
        }
      )

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentId,
        offset: 0,
        metadata: {},
      })

      expect(async () => {
        await uploadService.handleUploadFinish(
          stubIncomingMessage,
          stubServerResponse,
          stubUpload
        )
      }).rejects.toThrowError(
        '[403] Could not find data for session ID session-id'
      )
    })

    test('handles missing content size', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })

      vi.spyOn(app.prisma.fileMetadata, 'create')

      vi.spyOn(sessionStore, 'get').mockImplementationOnce(
        (_sessionId, callback) => {
          callback(null, {
            cookie: {
              originalMaxAge: null,
            },
            authenticated: true,
            userId: stubUserId,
          })
        }
      )

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentId,
        offset: 0,
        metadata: {
          isEncrypted: '1',
        },
      })

      expect(async () => {
        await uploadService.handleUploadFinish(
          stubIncomingMessage,
          stubServerResponse,
          stubUpload
        )
      }).rejects.toThrowError(
        '[400] contentSize must be a number. Received: undefined'
      )
    })

    test('handles invalid isEncrypted metadata', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })

      vi.spyOn(app.prisma.fileMetadata, 'create')

      vi.spyOn(sessionStore, 'get').mockImplementationOnce(
        (_sessionId, callback) => {
          callback(null, {
            cookie: {
              originalMaxAge: null,
            },
            authenticated: true,
            userId: stubUserId,
          })
        }
      )

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentId,
        offset: 0,
        size: stubContentSize,
        metadata: {
          // @ts-expect-error This is a forced error for the sake of testing
          isEncrypted: 1,
        },
      })

      expect(async () => {
        await uploadService.handleUploadFinish(
          stubIncomingMessage,
          stubServerResponse,
          stubUpload
        )
      }).rejects.toThrowError(
        '[400] metadata.isEncrypted must be either "0" or "1" (string). Received: 1 (number)'
      )
    })

    test('handles FileMetadata creation failure', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.create.mockRejectedValueOnce(new Error())

      vi.spyOn(sessionStore, 'get').mockImplementationOnce(
        (_sessionId, callback) => {
          callback(null, {
            cookie: {
              originalMaxAge: null,
            },
            authenticated: true,
            userId: stubUserId,
          })
        }
      )

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentId,
        offset: 0,
        size: stubContentSize,
        metadata: {
          isEncrypted: '1',
        },
      })

      expect(async () => {
        await uploadService.handleUploadFinish(
          stubIncomingMessage,
          stubServerResponse,
          stubUpload
        )
      }).rejects.toThrowError('[500] Could not record file metadata')
    })
  })
})
