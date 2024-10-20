import {
  DetailedError,
  HttpRequest,
  Upload,
  UploadOptions,
} from 'tus-js-client'
import { mockDeep } from 'vitest-mock-extended'

import { ContentService } from '.'

const getMockUpload = () => {
  const constructorSpy = vi.fn()

  class MockUpload extends Upload {
    constructor(file: Upload['file'], options: UploadOptions) {
      constructorSpy(file, options)
      super(file, options)
    }

    start(): void {
      this.options.onSuccess?.()
    }
  }

  return { MockUpload, constructorSpy }
}

describe('ContentService', () => {
  describe('onShouldRetry', () => {
    test.each([
      { statusType: 'ok response', statusCode: 200 },
      { statusType: 'redirect response', statusCode: 301 },
      { statusType: 'conflict error', statusCode: 409 },
      { statusType: 'locked error', statusCode: 423 },
      { statusType: 'server error', statusCode: 500 },
    ])('causes retry on $statusType', ({ statusCode }) => {
      const { MockUpload } = getMockUpload()

      const contentService = new ContentService({
        UploadImpl: MockUpload,
        contentRoute: '',
      })

      const mockRequest = mockDeep<DetailedError>()

      mockRequest.originalResponse?.getStatus.mockReturnValueOnce(statusCode)

      const result = contentService.onShouldRetry(mockRequest, 0, {})
      expect(result).toEqual(true)
    })

    test.each([{ statusType: 'authentication error', statusCode: 403 }])(
      'does not cause retry on $statusType',
      ({ statusCode }) => {
        const { MockUpload } = getMockUpload()

        const contentService = new ContentService({
          UploadImpl: MockUpload,
          contentRoute: '',
        })

        const mockRequest = mockDeep<DetailedError>()

        mockRequest.originalResponse?.getStatus.mockReturnValueOnce(statusCode)

        const result = contentService.onShouldRetry(mockRequest, 0, {})
        expect(result).toEqual(false)
      }
    )
  })

  describe('onBeforeRequest', () => {
    test('authenticates request', () => {
      const { MockUpload } = getMockUpload()

      const contentService = new ContentService({
        UploadImpl: MockUpload,
        contentRoute: '',
      })

      const mockRequest = mockDeep<HttpRequest>()
      const xhr = {
        withCredentials: false,
      }

      mockRequest.getUnderlyingObject.mockReturnValueOnce(xhr)

      contentService.onBeforeRequest(mockRequest)

      expect(xhr.withCredentials).toEqual(true)
    })
  })

  describe('upload', () => {
    test('uploads file', async () => {
      const { MockUpload, constructorSpy } = getMockUpload()

      const mockFile = new File([], 'plain/text')

      const contentService = new ContentService({
        UploadImpl: MockUpload,
        contentRoute: '',
      })

      await contentService.upload(mockFile, {})

      expect(constructorSpy).toHaveBeenCalledWith(mockFile, expect.any(Object))
    })
  })
})
