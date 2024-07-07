import { webcrypto } from 'crypto'

export const getKeypair = async ({
  algorithm = {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  extractable = true,
  usage = ['encrypt', 'decrypt'],
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
