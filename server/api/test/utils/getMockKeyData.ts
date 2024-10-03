/* c8 ignore start */
import { webcrypto } from 'crypto'

import {
  contentEncryptionKeyAlgorithmName,
  signatureKeyAlgorithmName,
  signatureKeyNamedCurve,
} from '../../src/constants'

import { SerializedKeys, deriveKey, importKey } from './crypto'

const getEncryptionKey = async () => {
  const encryptionKey = await webcrypto.subtle.generateKey(
    {
      name: contentEncryptionKeyAlgorithmName,
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
      name: signatureKeyAlgorithmName,
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

export const getMockKeyData = async (
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
      name: contentEncryptionKeyAlgorithmName,
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

export type MockKeyData = Awaited<ReturnType<typeof getMockKeyData>>
