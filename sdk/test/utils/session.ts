import { GetUserResponse, PasswayClient, SerializedKeys } from '../../src'
import { crypto } from '../../src/services/Crypto'
import { dataGenerator } from '../../src/services/DataGenerator'
import { dataTransform } from '../../src/services/DataTransform'

export const mockUserHandle = dataGenerator.getRandomUint8Array(16)
export const mockUserHandleString = dataTransform.bufferToBase64(mockUserHandle)
export const passkeyId = 'abc123'
export const mockIv = new Uint8Array(12)
export const mockSalt = new Uint8Array(16)
export const mockEncryptedKeys = 'encrypted keys'
export const mockPrivateKey = 'private key'
export const mockPublicKey = 'public key'

export const mockAuthenticatorAssertionResponse = Object.assign(
  new window.AuthenticatorAssertionResponse(),
  {
    clientDataJSON: dataGenerator.getRandomUint8Array(1),
    signature: dataGenerator.getRandomUint8Array(1),
    userHandle: mockUserHandle,
  }
)

export const mockPublicKeyCredential = Object.assign(
  new window.PublicKeyCredential(),
  {
    authenticatorAttachment: '',
    getClientExtensionResults: () => {
      throw new Error()
    },
    id: passkeyId,
    rawId: dataGenerator.getRandomUint8Array(1),
    response: mockAuthenticatorAssertionResponse,
    type: '',
  }
)

export const mockSerializedKeys: SerializedKeys = {
  encryptionKey: mockEncryptedKeys,
  salt: dataTransform.bufferToBase64(mockSalt),
  iv: dataTransform.bufferToBase64(mockIv),
  signatureKeys: {
    privateKey: 'signature private key',
    publicKey: 'signature public key',
  },
}

export const mockSignature = dataGenerator.getRandomUint8Array(1)

export const mockUserGetResponse: GetUserResponse = {
  user: {
    keys: mockEncryptedKeys,
    salt: dataTransform.bufferToBase64(mockSalt),
    iv: dataTransform.bufferToBase64(mockIv),
  },
}

export const authenticateSession = async (passwayClient: PasswayClient) => {
  vitest.spyOn(dataGenerator, 'getIv').mockResolvedValueOnce(mockIv)
  vitest.spyOn(dataGenerator, 'getSalt').mockResolvedValueOnce(mockSalt)

  vitest.spyOn(crypto, 'generateKeyData').mockResolvedValueOnce({
    encryptedKeys: mockEncryptedKeys,
    privateKey: mockPrivateKey,
    publicKey: mockPublicKey,
  })

  vitest
    .spyOn(navigator.credentials, 'get')
    .mockResolvedValueOnce(mockPublicKeyCredential)

  vitest
    .spyOn(crypto, 'decryptSerializedKeys')
    .mockResolvedValueOnce(mockSerializedKeys)

  vitest.spyOn(crypto, 'getSignature').mockResolvedValueOnce(mockSignature)

  const fetchSpy = vitest
    .spyOn(window, 'fetch')
    .mockResolvedValueOnce({
      ...new Response(),
      status: 200,
      json: async () => mockUserGetResponse,
    })
    .mockResolvedValueOnce({
      ...new Response(),
      status: 200,
    })
    .mockResolvedValueOnce({
      ...new Response(),
      status: 400,
    })

  const didAuthenticate = await passwayClient.createSession()

  return { didAuthenticate, fetchSpy }
}
