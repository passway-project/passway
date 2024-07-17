import { webcrypto } from 'crypto'

export const importKey = async (password: string) => {
  const encoder = new TextEncoder()

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
}

export const deriveKey = async (keyMaterial: CryptoKey, salt: BufferSource) => {
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export const getSignature = async (
  message: string,
  { privateKey }: { privateKey: string }
) => {
  const privateKeyBuffer = Buffer.from(privateKey, 'base64')
  const signaturePrivateKey = await webcrypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
      hash: 'SHA-256',
    },
    true,
    ['sign']
  )

  const dataBuffer = new TextEncoder().encode(message)
  const signature = await webcrypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
      saltLength: 32,
    },
    signaturePrivateKey,
    dataBuffer
  )

  return signature
}
