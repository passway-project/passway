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
}

export const dataTransform = new DataTransformService()
