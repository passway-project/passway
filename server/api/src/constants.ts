export const API_ROOT = 'api'

export enum containerName {
  CACHE = 'cache',
  CONTENT_STORE = 'content-store',
}

export const sessionKeyName = 'passwaySessionId'

export const signatureKeyAlgorithmName = 'ECDSA'
export const signatureKeyNamedCurve = 'P-521'
export const signatureKeyHashingAlgorithm = 'SHA-256'

// TODO: Make this configurable
export const signatureKeySaltLength = 32

export const contentEncryptionKeyAlgorithmName = 'AES-GCM'

export const contentBucketName = 'passway-bucket'
