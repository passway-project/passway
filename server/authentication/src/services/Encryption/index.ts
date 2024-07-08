import { webcrypto } from 'crypto'

export type KeyParams = {
  algorithm: webcrypto.RsaHashedKeyGenParams | webcrypto.EcKeyGenParams
  usage: KeyUsage[]
}

export const encryptionKeyParams: KeyParams = {
  algorithm: {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  usage: ['encrypt', 'decrypt'],
}

export const signatureKeyParams: KeyParams = {
  algorithm: {
    name: 'RSA-PSS',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: { name: 'SHA-256' },
  },
  usage: ['sign', 'verify'],
}
