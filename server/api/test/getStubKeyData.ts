import { webcrypto } from 'crypto'

import { deriveKey, importKey } from './utils/crypto'

const getEncryptionKey = async () => {
  const encryptionKey = await webcrypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256, // Can be 128, 192, or 256 bits
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
      name: 'ECDSA',
      namedCurve: 'P-256', // You can also use P-384 or P-521 for stronger security
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

export const getStubKeyData = async (passkeySecret: string) => {
  const signatureKeys = await getSignatureKeys()
  const encryptionKey = await getEncryptionKey()

  const keysString = JSON.stringify({
    encryptionKey,
    signatureKeys,
  })

  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const importedKey = await importKey(passkeySecret)
  const derivedKey = await deriveKey(importedKey, salt)

  const encryptedKeysBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
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
