import { webcrypto } from 'crypto'
import { encryptionKeyParams } from '../src/services/Encryption'

// FIXME: Replace uses of this in tests with getStubKeyData
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
