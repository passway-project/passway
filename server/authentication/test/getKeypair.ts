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

export const getKeypair = async ({
  algorithm = encryptionKeyParams.algorithm,
  extractable = true,
  usage = encryptionKeyParams.usage,
}: {
  algorithm?: webcrypto.RsaHashedKeyGenParams | webcrypto.EcKeyGenParams
  extractable?: boolean
  usage?: webcrypto.KeyUsage[]
} = {}) => {
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
