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

// NOTE: This does not appear to be explicitly defined by the MinIO client
// package, so it is defined explicitly in application code here.
/**
 * @see: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/Class/NoSuchKey/
 */
export const minioNoSuchKeyCode = 'NoSuchKey'

// NOTE: This does not appear to be defined as a type in Prisma, so it is a constant here.
/**
 * @see: https://www.prisma.io/docs/orm/reference/error-reference#p2025
 */
export const prismaNotFoundCode = 'P2025'
