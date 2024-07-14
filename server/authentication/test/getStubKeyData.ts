import { webcrypto } from 'crypto'
import {
  encryptionKeyParams,
  signatureKeyParams,
} from '../src/services/Encryption'
import { deriveKey, importKey } from './utils/crypto'

const getKeypair = async ({
  algorithm,
  extractable,
  usage,
}: {
  algorithm: webcrypto.RsaHashedKeyGenParams | webcrypto.EcKeyGenParams
  extractable: boolean
  usage: webcrypto.KeyUsage[]
}) => {
  const keypair = await webcrypto.subtle.generateKey(
    algorithm,
    extractable,
    usage
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
  const encryptionKeys = await getKeypair(encryptionKeyParams)
  const signatureKeys = await getKeypair(signatureKeyParams)

  const keysString = JSON.stringify({
    encryptionKeys,
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
