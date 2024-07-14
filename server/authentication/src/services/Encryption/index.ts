import { webcrypto } from 'crypto'

export type KeyParams = {
  algorithm: webcrypto.RsaHashedKeyGenParams | webcrypto.EcKeyGenParams
  usage: KeyUsage[]
  extractable: boolean
}

export const encryptionKeyParams: KeyParams = {
  algorithm: {
    name: 'RSA-OAEP',
    // TODO: Determine if this needs to be configurable
    modulusLength: 2048,
    // TODO: Determine if this needs to be configurable
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  usage: ['encrypt', 'decrypt'],
  extractable: true,
}

export const signatureKeyParams: KeyParams = {
  algorithm: {
    name: 'RSA-PSS',
    // TODO: Determine if this needs to be configurable
    modulusLength: 2048,
    // TODO: Determine if this needs to be configurable
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: { name: 'SHA-256' },
  },
  usage: ['sign', 'verify'],
  extractable: true,
}
