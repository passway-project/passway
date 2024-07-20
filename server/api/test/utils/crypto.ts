import { webcrypto } from 'crypto'

import {
  contentEncryptionAlgorithmName,
  hashingAlgorithm,
  signatureKeyAlgoritmName,
  signatureKeyNamedCurve,
  signatureKeySaltLength,
} from '../../src/constants'

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

const isSerializedKeys = (obj: unknown): obj is SerializedKeys => {
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

export const importKey = async (password: string) => {
  const encoder = new TextEncoder()

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
}

export const deriveKey = async (keyMaterial: CryptoKey, salt: BufferSource) => {
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: hashingAlgorithm,
    },
    keyMaterial,
    { name: contentEncryptionAlgorithmName, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export const getSignature = async (
  message: string,
  { privateKey }: { privateKey: string }
) => {
  const privateKeyBuffer = Buffer.from(privateKey, 'base64')
  const signaturePrivateKey = await webcrypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: signatureKeyAlgoritmName,
      namedCurve: signatureKeyNamedCurve,
    },
    true,
    ['sign']
  )

  const dataBuffer = new TextEncoder().encode(message)
  const signature = await webcrypto.subtle.sign(
    {
      name: signatureKeyAlgoritmName,
      hash: hashingAlgorithm,
      saltLength: signatureKeySaltLength,
    },
    signaturePrivateKey,
    dataBuffer
  )

  return signature
}

export const decryptSerializedKeys = async (
  encryptedKeys: string,
  passkeySecret: string,
  ivString: string,
  saltString: string
) => {
  const iv = Buffer.from(ivString, 'base64')
  const salt = Buffer.from(saltString, 'base64')
  const decoder = new TextDecoder()

  const importedKey = await importKey(passkeySecret)
  const derivedKey = await deriveKey(importedKey, salt)

  const encryptedKeysBuffer = Buffer.from(encryptedKeys, 'base64')

  const decryptedKeysBuffer = await crypto.subtle.decrypt(
    {
      name: contentEncryptionAlgorithmName,
      iv,
    },
    derivedKey,
    encryptedKeysBuffer
  )

  const decryptedKeysString = decoder.decode(decryptedKeysBuffer)
  const decryptedKeys = JSON.parse(decryptedKeysString)

  if (!isSerializedKeys(decryptedKeys)) {
    throw new Error()
  }

  return decryptedKeys
}
