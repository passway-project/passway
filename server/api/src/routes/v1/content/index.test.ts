import { Readable } from 'stream'

import { DeepMockProxy } from 'vitest-mock-extended'
import { PrismaClient, Prisma } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

import { S3Error } from 'minio'

import {
  API_ROOT,
  minioNoSuchKeyCode,
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
  contentId: 'mock-content-id-1',
  contentSize: 1024,
  createdAt: new Date(),
  id: 0,
  isEncrypted: true,
  userId: stubUserId,
}

const mockFileMetadataRecord2: Prisma.$FileMetadataPayload['scalars'] = {
  contentId: 'mock-content-id-2',
  contentSize: 2048,
  createdAt: new Date(),
  id: 1,
  isEncrypted: false,
  userId: stubUserId,
}

beforeAll(async () => {
  await hydrateMockKeyData(mockKeyData)
  hydrateMockUser(mockUser, mockKeyData)
})

describe(endpointRoute, () => {
  describe(`/${routeName}/list`, () => {
    describe('GET', () => {
      test('lists content', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

        ;(
          app.prisma as DeepMockProxy<PrismaClient>
        ).fileMetadata.findMany.mockResolvedValueOnce([
          mockFileMetadataRecord1,
          mockFileMetadataRecord2,
        ])

        const response = await app.inject({
          method: 'GET',
          url: `${endpointRoute}/list`,
          cookies: {
            [sessionKeyName]: sessionResponse.cookies[0].value,
          },
        })

        const bodyJson = await response.json()

        expect(response.statusCode).toEqual(StatusCodes.OK)
        expect(bodyJson).toEqual([
          {
            contentId: mockFileMetadataRecord1.contentId,
            contentSize: mockFileMetadataRecord1.contentSize,
            isEncrypted: mockFileMetadataRecord1.isEncrypted,
          },
          {
            contentId: mockFileMetadataRecord2.contentId,
            contentSize: mockFileMetadataRecord2.contentSize,
            isEncrypted: mockFileMetadataRecord2.isEncrypted,
          },
        ])
      })
    })
  })

  describe(`/${routeName}/:contentId`, () => {
    describe('GET', () => {
      test('responds with content data', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

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

      test('responds with a 404 if content is not available', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

        vi.spyOn(app.minioClient, 'getObject').mockRejectedValueOnce(
          Object.assign(new S3Error(), { code: minioNoSuchKeyCode })
        )

        const nonexistentContentId = 'some-nonexistent-content-id'

        const response = await app.inject({
          method: 'GET',
          url: `${endpointRoute}/${nonexistentContentId}`,
          cookies: {
            [sessionKeyName]: sessionResponse.cookies[0].value,
          },
        })

        const bodyJson = await response.json()

        expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
        expect(bodyJson).toMatchObject({
          message: `Content ID "${nonexistentContentId}" not found`,
        })
      })
    })
  })
})
