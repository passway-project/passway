import { IncomingMessage, ServerResponse } from 'http'
import { Socket } from 'net'

import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import { Upload } from '@tus/server'
import { StatusCodes } from 'http-status-codes'

import { sessionKeyName } from '../../constants'
import { sessionStore } from '../../__mocks__/sessionStore'
import { prismaPlugin } from '../../../prisma/prismaPlugin'

import { UploadService } from '.'

vi.mock('../../sessionStore')

const stubUserId = 1
const stubSessionId = 'session-id'
const stubContentId = 'abc123'
const stubContentSize = 1024

const getFastifyStub = async () => {
  const stubFastify = fastify()
  await stubFastify.register(fastifyCookie)
  await stubFastify.register(prismaPlugin)

  return stubFastify
}

describe('UploadService', () => {
  describe('handleUploadFinish', () => {
    test('creates FileMetadata record upon success', async () => {
      const stubFastify = await getFastifyStub()

      vi.spyOn(stubFastify, 'parseCookie').mockReturnValueOnce({
        [sessionKeyName]: stubSessionId,
      })

      vi.spyOn(stubFastify.prisma.fileMetadata, 'create')

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
        fastify: stubFastify,
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

      expect(stubFastify.prisma.fileMetadata.create).toHaveBeenCalledWith({
        data: {
          contentId: stubContentId,
          contentSize: stubContentSize,
          userId: stubUserId,
          isEncrypted: true,
        },
      })
    })

    test.skip('handles missing session data', () => {
      // FIXME: Implement this
    })

    test.skip('handles missing content size', () => {
      // FIXME: Implement this
    })

    test.skip('handles invalid isEncrypted metadata', () => {
      // FIXME: Implement this
    })

    test.skip('handles FileMetadata creation failure', () => {
      // FIXME: Implement this
    })
  })
})
