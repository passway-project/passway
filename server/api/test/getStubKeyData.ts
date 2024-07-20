import { webcrypto } from 'crypto'

import {
  contentEncryptionAlgorithmName,
  signatureKeyAlgoritmName,
  signatureKeyNamedCurve,
} from '../src/constants'

type SerializedSignatureKeys = {
  publicKey: string
  privateKey: string
}

type SerializedKeys = {
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

import { deriveKey, importKey } from './utils/crypto'

const getEncryptionKey = async () => {
  const encryptionKey = await webcrypto.subtle.generateKey(
    {
      name: contentEncryptionAlgorithmName,
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )

  const encryptionKeyString = Buffer.from(
    await webcrypto.subtle.exportKey('raw', encryptionKey)
  ).toString('base64')

  return encryptionKeyString
}

const getSignatureKeys = async () => {
  const keypair = await webcrypto.subtle.generateKey(
    {
      name: signatureKeyAlgoritmName,
      namedCurve: signatureKeyNamedCurve,
    },
    true,
    ['sign', 'verify']
  )

  const publicKey = Buffer.from(
    await webcrypto.subtle.exportKey('spki', keypair.publicKey)
  ).toString('base64')

  const privateKey = Buffer.from(
    await webcrypto.subtle.exportKey('pkcs8', keypair.privateKey)
  ).toString('base64')

  return { publicKey, privateKey }
}

export const getStubKeyData = async (
  passkeySecret: string,
  iv: Uint8Array,
  salt: Uint8Array
) => {
  const signatureKeys = await getSignatureKeys()
  const encryptionKey = await getEncryptionKey()

  const ivString = Buffer.from(iv).toString('base64')
  const saltString = Buffer.from(salt).toString('base64')

  const keys: SerializedKeys = {
    encryptionKey,
    signatureKeys,
    iv: ivString,
    salt: saltString,
  }
  const keysString = JSON.stringify(keys)

  const encoder = new TextEncoder()

  const importedKey = await importKey(passkeySecret)
  const derivedKey = await deriveKey(importedKey, salt)

  const encryptedKeysBuffer = await crypto.subtle.encrypt(
    {
      name: contentEncryptionAlgorithmName,
      iv,
    },
    derivedKey,
    encoder.encode(keysString)
  )

  const encryptedKeys = Buffer.from(encryptedKeysBuffer).toString('base64')

  return {
    ...signatureKeys,
    encryptedKeys,
  }
}

export const decryptStubKeyData = async (
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

export type StubKeyData = Awaited<ReturnType<typeof getStubKeyData>>
