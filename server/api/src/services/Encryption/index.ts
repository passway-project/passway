import { webcrypto } from 'crypto'

export type KeyParams = {
  algorithm: webcrypto.RsaHashedKeyGenParams | webcrypto.EcKeyGenParams
  usage: KeyUsage[]
  extractable: boolean
}

// FIXME: Instead of using an RSA keypair for encrypting user content, use an AES key for encryption/decryption
export const encryptionKeyParams: KeyParams = {
  algorithm: {
    name: 'RSA-OAEP',
    // TODO: Make this configurable
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  usage: ['encrypt', 'decrypt'],
  extractable: true,
}

export const signatureKeyParams: KeyParams = {
  algorithm: {
    name: 'RSA-PSS',
    // TODO: Make this configurable
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: { name: 'SHA-256' },
  },
  usage: ['sign', 'verify'],
  extractable: true,
}
