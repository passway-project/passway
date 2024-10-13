import { Upload, UploadOptions } from 'tus-js-client'

import { uploadChunkSizeMB } from '../../constants'

/**
 * @internal
 */
export class ContentService {
  private UploadImpl: typeof Upload
  private contentRoute: string

  constructor({
    UploadImpl = Upload,
    contentRoute,
  }: {
    UploadImpl?: typeof Upload
    contentRoute: string
  }) {
    this.UploadImpl = UploadImpl
    this.contentRoute = contentRoute
  }

  onShouldRetry: NonNullable<UploadOptions['onShouldRetry']> = err => {
    const status = err.originalResponse ? err.originalResponse.getStatus() : 0

    if (status === 403) {
      return false
    }

    return true
  }

  // FIXME: Test this
  onBeforeRequest: NonNullable<UploadOptions['onBeforeRequest']> = request => {
    const xhr: XMLHttpRequest = request.getUnderlyingObject()
    xhr.withCredentials = true
  }

  upload = (
    dataStream: Upload['file'],
    metadata: UploadOptions['metadata']
  ) => {
    const uploadPromise = new Promise<void>((resolve, reject) => {
      const upload = new this.UploadImpl(dataStream, {
        chunkSize: uploadChunkSizeMB * 1024 * 1024,
        uploadLengthDeferred: true,
        endpoint: this.contentRoute,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata,

        onError: error => {
          console.error('Upload failed: ' + error)
          reject(error)
        },

        onSuccess: () => {
          resolve()
        },

        onShouldRetry: this.onShouldRetry,
        onBeforeRequest: this.onBeforeRequest,
      })

      upload.start()
    })

    return uploadPromise
  }
}
