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

export type SerializedSignatureKeys = {
  publicKey: string
  privateKey: string
}

export type SerializedKeys = {
  encryptionKey: string
  signatureKeys: SerializedSignatureKeys
  iv: string
  salt: string
}
