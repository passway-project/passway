import { SerializedKeys, isSerializedKeys } from '../../types'

export const signatureKeyAlgorithmName = 'ECDSA'
export const signatureKeyNamedCurve = 'P-521'
export const signatureKeyHashingAlgorithm = 'SHA-256'
export const signatureKeySaltLength = 32
export const contentEncryptionKeyAlgorithmName = 'AES-GCM'

export class CryptoService {
  importKey = async (password: string) => {
    const encoder = new TextEncoder()

    return window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
  }

  deriveKey = async (keyMaterial: CryptoKey, salt: BufferSource) => {
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: signatureKeyHashingAlgorithm,
      },
      keyMaterial,
      { name: contentEncryptionKeyAlgorithmName, length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  generateEncryptionKey = async () => {
    const encryptionKey = await window.crypto.subtle.generateKey(
      {
        name: contentEncryptionKeyAlgorithmName,
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )

    const encryptionKeyString = Buffer.from(
      await window.crypto.subtle.exportKey('raw', encryptionKey)
    ).toString('base64')

    return encryptionKeyString
  }

  generateSignatureKeys = async () => {
    const keypair = await window.crypto.subtle.generateKey(
      {
        name: signatureKeyAlgorithmName,
        namedCurve: signatureKeyNamedCurve,
      },
      true,
      ['sign', 'verify']
    )

    const publicKey = Buffer.from(
      await window.crypto.subtle.exportKey('spki', keypair.publicKey)
    ).toString('base64')

    const privateKey = Buffer.from(
      await window.crypto.subtle.exportKey('pkcs8', keypair.privateKey)
    ).toString('base64')

    return { publicKey, privateKey }
  }

  generateKeyData = async (
    passkeySecret: string,
    iv: Uint8Array,
    salt: Uint8Array
  ) => {
    const signatureKeys = await this.generateSignatureKeys()
    const encryptionKey = await this.generateEncryptionKey()

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

    const importedKey = await this.importKey(passkeySecret)
    const derivedKey = await this.deriveKey(importedKey, salt)

    const encryptedKeysBuffer = await window.crypto.subtle.encrypt(
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

  // FIXME: The semantics of this function and related types need to be improved (the keys aren't serialized here)
  decryptSerializedKeys = async (
    encryptedKeys: string,
    passkeySecret: string,
    ivString: string,
    saltString: string
  ) => {
    const iv = Buffer.from(ivString, 'base64')
    const salt = Buffer.from(saltString, 'base64')
    const decoder = new TextDecoder()

    const importedKey = await this.importKey(passkeySecret)
    const derivedKey = await this.deriveKey(importedKey, salt)

    const encryptedKeysBuffer = Buffer.from(encryptedKeys, 'base64')

    const decryptedKeysBuffer = await window.crypto.subtle.decrypt(
      {
        name: contentEncryptionKeyAlgorithmName,
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

  getSignature = async (
    message: string,
    { privateKey }: { privateKey: string }
  ) => {
    const privateKeyBuffer = Buffer.from(privateKey, 'base64')
    const signaturePrivateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: signatureKeyAlgorithmName,
        namedCurve: signatureKeyNamedCurve,
      },
      true,
      ['sign']
    )

    const dataBuffer = new TextEncoder().encode(message)
    const signature = await window.crypto.subtle.sign(
      {
        name: signatureKeyAlgorithmName,
        hash: signatureKeyHashingAlgorithm,
        saltLength: signatureKeySaltLength,
      },
      signaturePrivateKey,
      dataBuffer
    )

    return signature
  }
}

export const crypto = new CryptoService()
