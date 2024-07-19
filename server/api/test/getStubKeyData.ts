import { webcrypto } from 'crypto'

import {
  contentEncryptionAlgorithmName,
  signatureKeyAlgoritmName,
  signatureKeyNamedCurve,
} from '../src/constants'

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

  return { encryptionKey: encryptionKeyString }
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

  const keysString = JSON.stringify({
    encryptionKey,
    signatureKeys,
    iv: ivString,
    salt: saltString,
  })

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

export type StubKeyData = Awaited<ReturnType<typeof getStubKeyData>>
