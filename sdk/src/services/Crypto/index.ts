import window from 'global/window'
import { Keychain } from 'wormhole-crypto'

import { SerializedKeys, isSerializedKeys } from '../../types'

const signatureKeyAlgorithmName = 'ECDSA'
const signatureKeyNamedCurve = 'P-521'
const signatureKeyHashingAlgorithm = 'SHA-256'
const signatureKeySaltLength = 32
const contentEncryptionKeyAlgorithmName = 'AES-GCM'
const contentEncryptionKeyAlgorithmLength = 256

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
      {
        name: contentEncryptionKeyAlgorithmName,
        length: contentEncryptionKeyAlgorithmLength,
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  generateEncryptionKey = async () => {
    const encryptionKey = await window.crypto.subtle.generateKey(
      {
        name: contentEncryptionKeyAlgorithmName,
        length: contentEncryptionKeyAlgorithmLength,
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

    const keys: SerializedKeys = {
      encryptionKey,
      signatureKeys,
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64'),
    }

    const keysString = JSON.stringify(keys)

    const importedKey = await this.importKey(passkeySecret)
    const derivedKey = await this.deriveKey(importedKey, salt)

    const encryptedKeysBuffer = await window.crypto.subtle.encrypt(
      {
        name: contentEncryptionKeyAlgorithmName,
        iv,
      },
      derivedKey,
      new TextEncoder().encode(keysString)
    )

    const encryptedKeys = Buffer.from(encryptedKeysBuffer).toString('base64')

    return {
      ...signatureKeys,
      encryptedKeys,
    }
  }

  decryptSerializedKeys = async (
    encryptedKeys: string,
    passkeySecret: string,
    ivString: string,
    saltString: string
  ) => {
    const importedKey = await this.importKey(passkeySecret)
    const derivedKey = await this.deriveKey(
      importedKey,
      Buffer.from(saltString, 'base64')
    )

    const encryptedKeysBuffer = Buffer.from(encryptedKeys, 'base64')

    const decryptedKeysBuffer = await window.crypto.subtle.decrypt(
      {
        name: contentEncryptionKeyAlgorithmName,
        iv: Buffer.from(ivString, 'base64'),
      },
      derivedKey,
      encryptedKeysBuffer
    )

    const decryptedKeysString = new TextDecoder().decode(decryptedKeysBuffer)
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
    const signaturePrivateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      Buffer.from(privateKey, 'base64'),
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

  getKeychain = (password: string, salt = window.location.host) => {
    const encoder = new TextEncoder()
    const keyLength = 16
    const padding = new Array(keyLength).join('0')
    const key = password.concat(padding).slice(0, keyLength)
    const paddedSalt = salt.concat(padding).slice(0, keyLength)

    const keychain = new Keychain(
      encoder.encode(key),
      encoder.encode(paddedSalt)
    )

    return keychain
  }
}

export const crypto = new CryptoService()
