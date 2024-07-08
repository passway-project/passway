import { webcrypto } from 'crypto'
import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'
import { routeName } from '.'
import { getKeypair } from '../../../../test/getKeypair'
import { signatureKeyParams } from '../../../services/Encryption'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const stubUserId = 0
const stubUserPasskeySecret = 'abc123'
let stubUserEncryptedKeysData = ''
let stubUserPublicKeyData = ''
let stubUserPrivateKeyData = ''

const importKey = async (password: string) => {
  const encoder = new TextEncoder()

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
}

const deriveKey = async (keyMaterial: CryptoKey, salt: BufferSource) => {
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

beforeAll(async () => {
  const encryptionKeys = await getKeypair()
  const signatureKeys = await getKeypair(signatureKeyParams)

  stubUserPublicKeyData = signatureKeys.publicKey
  stubUserPrivateKeyData = signatureKeys.privateKey

  const keysString = JSON.stringify({
    encryptionKeys,
    signatureKeys,
  })

  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const importedKey = await importKey(stubUserPasskeySecret)
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

  stubUserEncryptedKeysData = encryptedKeysString
})

describe(endpointRoute, () => {
  test('handles nonexistent user lookup', async () => {
    const app = getApp()
    const passkeyId = 'foo'

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())

    const response = await app.inject({
      method: 'POST',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: false })
    expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
  })

  test('creates session for valid user authentication request', async () => {
    const app = getApp()
    const passkeyId = 'foo'
    const now = Date.now()
    const preexistingUser: User = {
      id: stubUserId,
      passkeyId,
      encryptedKeys: stubUserEncryptedKeysData,
      publicKey: stubUserPublicKeyData,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    const publicKeyBuffer = Buffer.from(stubUserPublicKeyData, 'base64')
    const signaturePublicKeyBuffer = await webcrypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: signatureKeyParams.algorithm.name,
        namedCurve: 'P-256',
        hash: 'SHA-256',
      },
      true,
      ['verify']
    )

    const privateKeyBuffer = Buffer.from(stubUserPrivateKeyData, 'base64')
    const signaturePrivateKeyBuffer = await webcrypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: signatureKeyParams.algorithm.name,
        namedCurve: 'P-256',
        hash: 'SHA-256',
      },
      true,
      ['sign']
    )

    const saltLength = 32
    const rawData = 'Hello, World!'
    const dataBuffer = new TextEncoder().encode(rawData)
    const signature = await webcrypto.subtle.sign(
      {
        name: signatureKeyParams.algorithm.name,
        hash: 'SHA-256',
        saltLength,
      },
      signaturePrivateKeyBuffer,
      dataBuffer
    )

    // FIXME: Move this to the route handler
    const isValid = await webcrypto.subtle.verify(
      {
        name: signatureKeyParams.algorithm.name,
        hash: 'SHA-256',
        saltLength,
      },
      signaturePublicKeyBuffer,
      signature,
      dataBuffer
    )

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockResolvedValueOnce(preexistingUser)

    const response = await app.inject({
      method: 'POST',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })
  })
})
