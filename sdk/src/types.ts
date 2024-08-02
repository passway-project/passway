export interface PasskeyConfig {
  appName: string
  userName: string
  userDisplayName: string
}

export interface PutUserBody {
  encryptedKeys: string
  id: string
  iv: string
  publicKey: string
  salt: string
}

export interface SerializedSignatureKeys {
  publicKey: string
  privateKey: string
}

export interface SerializedKeys {
  encryptionKey: string
  signatureKeys: SerializedSignatureKeys
  iv: string
  salt: string
}

const isSerializedSignatureKeys = (
  obj: unknown
): obj is SerializedSignatureKeys => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  return (
    'publicKey' in obj &&
    typeof obj.publicKey === 'string' &&
    'privateKey' in obj &&
    typeof obj.privateKey === 'string'
  )
}

export const isSerializedKeys = (obj: unknown): obj is SerializedKeys => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  return (
    'encryptionKey' in obj &&
    typeof obj.encryptionKey === 'string' &&
    'signatureKeys' in obj &&
    isSerializedSignatureKeys(obj.signatureKeys) &&
    'iv' in obj &&
    typeof obj.iv === 'string' &&
    'salt' in obj &&
    typeof obj.salt === 'string'
  )
}

export interface GetUserResponse {
  user: {
    iv: string
    keys: string
    salt: string
  }
}

export const isGetUserResponse = (
  response: unknown
): response is GetUserResponse => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'user' in response &&
    typeof response.user === 'object' &&
    response.user !== null &&
    'iv' in response.user &&
    typeof response.user.iv === 'string' &&
    'salt' in response.user &&
    typeof response.user.salt === 'string' &&
    'keys' in response.user &&
    typeof response.user.keys === 'string'
  )
}
