import { PassThrough } from 'node:stream'

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

  // NOTE: Adapted from https://chatgpt.com/share/6715437d-6cfc-8011-ad1f-97d52c2bed3f
  streamToString = async (stream: ReadableStream): Promise<string> => {
    const reader = stream.getReader()
    const decoder = new TextDecoder() // Used to decode binary data to string
    let result = ''

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const readData = await reader.read()

      const { done, value } = readData

      if (done) {
        break // Stream is fully read
      }

      // Convert binary chunks (if any) to string and append to result
      result += decoder.decode(value, { stream: true })
    }

    // Finish decoding (some streams may need final decoding)
    result += decoder.decode()

    return result
  }

  // NOTE: Adapted from https://chatgpt.com/share/66e796d0-e340-8011-affe-8c6199269cbf
  convertReaderToStream = (
    reader: Pick<ReadableStreamDefaultReader, 'read'>
  ): ReadableStream => {
    return new ReadableStream({
      async pull(controller) {
        const readData = await reader.read()

        const { done, value } = readData

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
  // NOTE: Adapted from https://chatgpt.com/share/66e796d0-e340-8011-affe-8c6199269cbf
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

  // Adapted from https://chatgpt.com/share/6715435c-c7a0-8011-b267-c4c9a2627f5b
  passThroughToReadableStream = (
    passThrough: PassThrough
  ): ReadableStream<Uint8Array> => {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        passThrough.on('data', (chunk: Buffer) => {
          // Push the chunk as a Uint8Array
          controller.enqueue(new Uint8Array(chunk))
        })

        passThrough.on('end', () => {
          // Close the stream when PassThrough finishes
          controller.close()
        })

        passThrough.on('error', err => {
          // If an error occurs, cancel the stream
          controller.error(err)
        })
      },

      cancel() {
        // If the consumer cancels, destroy the PassThrough stream
        passThrough.destroy()
      },
    })
  }
}

export const dataTransform = new DataTransformService()
