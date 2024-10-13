import { DetailedError, HttpRequest, Upload } from 'tus-js-client'
import { mockDeep } from 'vitest-mock-extended'

import { ContentService } from '.'

class MockUpload extends Upload {
  start(): void {
    this.options.onSuccess?.()
  }
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

  describe.skip('upload', () => {})
})
