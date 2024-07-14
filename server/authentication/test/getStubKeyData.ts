import { signatureKeyParams } from '../src/services/Encryption'
import { getKeypair } from './getKeypair'
import { deriveKey, importKey } from './utils/crypto'

export const getStubKeyData = async (passkeySecret: string) => {
  const encryptionKeys = await getKeypair()
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

  const encryptedKeys = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    derivedKey,
    encoder.encode(keysString)
  )

  const encryptedKeysString = Buffer.from(encryptedKeys).toString('base64')

  return {
    ...signatureKeys,
    encryptedKeysString,
  }
}
