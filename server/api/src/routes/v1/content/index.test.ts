import { Readable } from 'stream'

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient, Prisma } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

import { S3Error } from 'minio'

import {
  API_ROOT,
  minioNoSuchKeyCode,
  prismaNotFoundCode,
  sessionKeyName,
} from '../../../constants'
import { requestAuthenticatedSession } from '../../../../test/utils/session'
import {
  getStubUser,
  hydrateMockUser,
  stubKeyData,
  stubUserId,
} from '../../../../test/stubs'
import { getApp } from '../../../../test/utils/getApp'
import { hydrateMockKeyData } from '../../../../test/utils/keyData'
import { streamToString } from '../../../../test/utils/stream'

import { routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const mockKeyData = stubKeyData()
const mockUser = getStubUser()
const mockContentDataString = 'content data'

const mockFileMetadataRecord1: Prisma.$FileMetadataPayload['scalars'] = {
  contentObjectId: 'mock-content-object-id-1',
  contentId: 'mock content ID 1',
  contentSize: 1024,
  createdAt: new Date(),
  id: 0,
  isEncrypted: true,
  userId: stubUserId,
}

beforeAll(async () => {
  await hydrateMockKeyData(mockKeyData)
  hydrateMockUser(mockUser, mockKeyData)
})

describe(endpointRoute, () => {
  describe(`/${routeName}/:contentId`, () => {
    describe('GET', () => {
      test('responds with content data', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

        ;(
          app.prisma as DeepMockProxy<PrismaClient>
        ).fileMetadata.findFirstOrThrow.mockResolvedValueOnce(
          mockFileMetadataRecord1
        )

        vi.spyOn(app.minioClient, 'getObject').mockResolvedValueOnce(
          Readable.from(mockContentDataString)
        )

        const response = await app.inject({
          method: 'GET',
          url: `${endpointRoute}/${mockFileMetadataRecord1.contentId}`,
          cookies: {
            [sessionKeyName]: sessionResponse.cookies[0].value,
          },
        })

        const retrievedContentString = await streamToString(response.stream())

        expect(response.statusCode).toEqual(StatusCodes.OK)
        expect(retrievedContentString).toEqual(mockContentDataString)
      })

      test('responds with a 404 if content metadata is not available', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

        ;(
          app.prisma as DeepMockProxy<PrismaClient>
        ).fileMetadata.findFirstOrThrow.mockRejectedValueOnce(
          new PrismaClientKnownRequestError('', {
            code: prismaNotFoundCode,
            clientVersion:
              'An operation failed because it depends on one or more records that were required but not found.',
          })
        )

        const nonexistentContentName = 'some-nonexistent-content-name'

        const response = await app.inject({
          method: 'GET',
          url: `${endpointRoute}/${nonexistentContentName}`,
          cookies: {
            [sessionKeyName]: sessionResponse.cookies[0].value,
          },
        })

        const bodyJson = await response.json()

        expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
        expect(bodyJson).toMatchObject({
          message: `Content retrieval for "${nonexistentContentName}" failed`,
        })
      })

      test('responds with a 404 if object content is not available', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

        ;(
          app.prisma as DeepMockProxy<PrismaClient>
        ).fileMetadata.findFirstOrThrow.mockResolvedValueOnce(
          mockFileMetadataRecord1
        )

        vi.spyOn(app.minioClient, 'getObject').mockRejectedValueOnce(
          Object.assign(new S3Error(), { code: minioNoSuchKeyCode })
        )

        const nonexistentContentName = 'some-nonexistent-content-name'

        const response = await app.inject({
          method: 'GET',
          url: `${endpointRoute}/${nonexistentContentName}`,
          cookies: {
            [sessionKeyName]: sessionResponse.cookies[0].value,
          },
        })

        const bodyJson = await response.json()

        expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
        expect(bodyJson).toMatchObject({
          message: `Content retrieval for "${nonexistentContentName}" failed`,
        })
      })
    })
  })
})
