export class DataTransformService {
  stringToUintArray = (str: string) => {
    const textEncoder = new TextEncoder()
    const uint8Array = textEncoder.encode(str)

    return uint8Array
  }

  bufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    let str = ''

    for (const charCode of bytes) {
      str += String.fromCharCode(charCode)
    }

    const base64String = btoa(str)

    return base64String
  }

  // NOTE: Adapted from https://chatgpt.com/share/66e796d0-e340-8011-affe-8c6199269cbf
  convertReaderToStream = (
    reader: Pick<ReadableStreamDefaultReader, 'read'>
  ): ReadableStream => {
    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()

        if (done) {
          controller.close()
          return
        }

        controller.enqueue(value)
      },
      cancel() {
        // TODO: Implement this
        // Optional: handle stream cancellation if necessary
      },
    })
  }

  // TODO: Currently this is only used by the playground. Expose it in actual
  // SDK methods somehow.
  convertWriterToStream = (
    writer: WritableStreamDefaultWriter<Uint8Array>
  ): WritableStream<Uint8Array> => {
    return new WritableStream<Uint8Array>({
      async write(chunk) {
        await writer.write(chunk)
      },
      async close() {
        await writer.close()
      },
      async abort(err) {
        await writer.abort(err)
      },
    })
  }
}

export const dataTransform = new DataTransformService()
