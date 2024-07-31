export class DataTransformService {
  stringToUintArray = (str: string) => {
    const textEncoder = new TextEncoder()
    const uint8Array = textEncoder.encode(str)

    return uint8Array
  }
}

export const dataTransform = new DataTransformService()
