import { IncomingMessage, ServerResponse } from 'http'
import { Socket } from 'net'

import { mockDeep } from 'vitest-mock-extended'
import { Server, Upload } from '@tus/server'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

import { sessionKeyName } from '../../constants'
import { sessionStore } from '../../__mocks__/sessionStore'
import { getApp } from '../../../test/utils/getApp'

import { UploadService } from '.'

const stubUserId = 1
const stubSessionId = 'session-id'

const stubContentObjectId1 = 'abc123'
const stubContentId1 = 'content ID 1'
const stubContentSize1 = 1024
const stubFileMetadataRecordId1 = 1

const stubContentObjectId2 = 'def456'
const stubContentId2 = 'content ID 2'
const stubContentSize2 = 2048
const stubFileMetadataRecordId2 = 2

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
        contentObjectId: stubContentObjectId1,
        contentId: stubContentId1,
        contentSize: stubContentSize1,
        createdAt: new Date(),
        id: stubFileMetadataRecordId1,
        userId: stubUserId,
      })
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.findMany.mockResolvedValueOnce([])

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
        id: stubContentObjectId1,
        offset: 0,
        size: stubContentSize1,
        metadata: {
          id: stubContentId1,
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
          contentObjectId: stubContentObjectId1,
          contentId: stubContentId1,
          contentSize: stubContentSize1,
          userId: stubUserId,
        },
      })
    })

    test('removes old versions of content', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.create.mockResolvedValueOnce({
        contentObjectId: stubContentObjectId1,
        contentId: stubContentId1,
        contentSize: stubContentSize1,
        createdAt: new Date(),
        id: stubFileMetadataRecordId1,
        userId: stubUserId,
      })
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.findMany.mockResolvedValueOnce([
        {
          contentObjectId: stubContentObjectId2,
          contentId: stubContentId2,
          contentSize: stubContentSize2,
          createdAt: new Date(),
          id: stubFileMetadataRecordId2,
          userId: stubUserId,
        },
      ])

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

      const mockServerImpl = mockDeep<Server>()

      const uploadService = new UploadService({
        app,
        path: '/',
        ServerImpl: mockServerImpl,
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentObjectId1,
        offset: 0,
        size: stubContentSize1,
        metadata: {
          id: stubContentId1,
        },
      })

      const response = await uploadService.handleUploadFinish(
        stubIncomingMessage,
        stubServerResponse,
        stubUpload
      )

      expect(response.statusCode).toEqual(StatusCodes.OK)

      expect(app.prisma.fileMetadata.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [stubFileMetadataRecordId2],
          },
        },
      })

      expect(mockServerImpl.datastore.remove).toHaveBeenCalledWith(
        stubContentObjectId2
      )
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
        id: stubContentObjectId1,
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
        id: stubContentObjectId1,
        offset: 0,
        metadata: {
          id: stubContentId1,
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

    test('handles missing id metadata', async () => {
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
        id: stubContentObjectId1,
        offset: 0,
        size: stubContentSize1,
        metadata: {},
      })

      expect(async () => {
        await uploadService.handleUploadFinish(
          stubIncomingMessage,
          stubServerResponse,
          stubUpload
        )
      }).rejects.toThrowError('[400] Content ID not provided')
    })

    test('handles FileMetadata creation failure', async () => {
      const app = getApp()

      vi.spyOn(app, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.create.mockRejectedValueOnce(new Error())
      ;(
        app.prisma as DeepMockProxy<PrismaClient>
      ).fileMetadata.findMany.mockResolvedValueOnce([])

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
        id: stubContentObjectId1,
        offset: 0,
        size: stubContentSize1,
        metadata: {
          id: stubContentId1,
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

  describe('handleUploadFinish', () => {
    test('enables sequence to proceed', async () => {
      const app = getApp()

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentObjectId1,
        offset: 0,
        metadata: {
          id: stubContentId1,
        },
      })

      const response = await uploadService.handleUploadCreate(
        stubIncomingMessage,
        stubServerResponse,
        stubUpload
      )

      expect(response.statusCode).toEqual(StatusCodes.OK)
    })

    test('handles missing session data', async () => {
      const app = getApp()

      const uploadService = new UploadService({
        app,
        path: '/',
      })

      const stubIncomingMessage = new IncomingMessage(new Socket())
      const stubServerResponse = new ServerResponse(stubIncomingMessage)
      const stubUpload = new Upload({
        id: stubContentObjectId1,
        offset: 0,
        metadata: {},
      })

      expect(async () => {
        await uploadService.handleUploadCreate(
          stubIncomingMessage,
          stubServerResponse,
          stubUpload
        )
      }).rejects.toThrowError('[400] Content ID not provided')
    })
  })
})
