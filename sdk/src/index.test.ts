import { File } from 'node:buffer'

import { Upload, UploadOptions } from 'tus-js-client'

import {
  LoginError,
  LogoutError,
  PasskeyCreationError,
  RegistrationError,
} from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'

import { GetUserResponse, PasswayClient, SerializedKeys } from '.'

let passwayClient = new PasswayClient({ apiRoot: '' })

const mockUserHandle = dataGenerator.getRandomUint8Array(16)
const mockUserHandleString = dataTransform.bufferToBase64(mockUserHandle)
const passkeyId = 'abc123'
const mockIv = new Uint8Array(12)
const mockSalt = new Uint8Array(16)
const mockEncryptedKeys = 'encrypted keys'
const mockPrivateKey = 'private key'
const mockPublicKey = 'public key'

const mockAuthenticatorAssertionResponse = Object.assign(
  new window.AuthenticatorAssertionResponse(),
  {
    clientDataJSON: dataGenerator.getRandomUint8Array(1),
    signature: dataGenerator.getRandomUint8Array(1),
    userHandle: mockUserHandle,
  }
)

const mockPublicKeyCredential = Object.assign(
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

const mockSerializedKeys: SerializedKeys = {
  encryptionKey: mockEncryptedKeys,
  salt: dataTransform.bufferToBase64(mockSalt),
  iv: dataTransform.bufferToBase64(mockIv),
  signatureKeys: {
    privateKey: 'signature private key',
    publicKey: 'signature public key',
  },
}

const mockSignature = dataGenerator.getRandomUint8Array(1)

const mockUserGetResponse: GetUserResponse = {
  user: {
    keys: mockEncryptedKeys,
    salt: dataTransform.bufferToBase64(mockSalt),
    iv: dataTransform.bufferToBase64(mockIv),
  },
}

beforeEach(() => {
  passwayClient = new PasswayClient({ apiRoot: '' })
})

describe('PasswayClient', () => {
  describe('createPasskey', () => {
    test('creates a passkey', async () => {
      const createSpy = vitest
        .spyOn(navigator.credentials, 'create')
        .mockResolvedValueOnce({
          id: 'id',
          type: 'type',
        })

      const mockRegistrationConfig = {
        appName: 'appName',
        userDisplayName: 'User',
        userName: 'user-name',
      }

      await passwayClient.createPasskey(mockRegistrationConfig)

      expect(createSpy).toHaveBeenCalledWith({
        publicKey: {
          challenge: expect.any(Uint8Array),
          rp: {
            name: mockRegistrationConfig.appName,
          },
          user: {
            id: expect.any(Uint8Array),
            name: mockRegistrationConfig.userName,
            displayName: mockRegistrationConfig.userDisplayName,
          },
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: -7,
            },
          ],
          authenticatorSelection: {
            userVerification: 'preferred',
            requireResidentKey: false,
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      })
    })

    test('handles passkey creation error', async () => {
      vitest
        .spyOn(navigator.credentials, 'create')
        .mockRejectedValueOnce(undefined)

      const mockRegistrationConfig = {
        appName: 'appName',
        userDisplayName: 'User',
        userName: 'user-name',
      }

      await expect(async () => {
        await passwayClient.createPasskey(mockRegistrationConfig)
      }).rejects.toThrowError(PasskeyCreationError)
    })
  })

  describe('createUser', () => {
    test('creates user', async () => {
      const mockPublicKeyCredential = Object.assign(
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

      const fetchSpy = vitest
        .spyOn(window, 'fetch')
        .mockResolvedValueOnce({ ...new Response(), status: 201 })

      await passwayClient.createUser()

      expect(fetchSpy).toHaveBeenCalledWith(`/v1/user`, {
        method: 'PUT',
        // NOTE: This is validated below
        body: expect.any(String),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const body = String(fetchSpy.mock.calls[0][1]?.body)

      expect(JSON.parse(body)).toEqual({
        id: passkeyId,
        salt: dataTransform.bufferToBase64(mockSalt),
        iv: dataTransform.bufferToBase64(mockIv),
        encryptedKeys: mockEncryptedKeys,
        publicKey: mockPublicKey,
      })
    })

    test('handles user creation failure due to passkey retrieval error', async () => {
      vitest.spyOn(dataGenerator, 'getIv').mockResolvedValueOnce(mockIv)
      vitest.spyOn(dataGenerator, 'getSalt').mockResolvedValueOnce(mockSalt)

      vitest.spyOn(crypto, 'generateKeyData').mockResolvedValueOnce({
        encryptedKeys: mockEncryptedKeys,
        privateKey: mockPrivateKey,
        publicKey: mockPublicKey,
      })

      const fetchSpy = vitest.spyOn(window, 'fetch')

      vitest
        .spyOn(navigator.credentials, 'get')
        .mockRejectedValueOnce(undefined)

      await expect(async () => {
        await passwayClient.createUser()
      }).rejects.toThrowError(RegistrationError)

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('handles user creation failure response', async () => {
      const mockPublicKeyCredential = Object.assign(
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
        .spyOn(window, 'fetch')
        .mockResolvedValueOnce({ ...new Response(), status: 500 })

      await expect(async () => {
        await passwayClient.createUser()
      }).rejects.toThrowError(RegistrationError)
    })
  })

  describe('createSession', () => {
    test('creates session with fresh credentials', async () => {
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

      const result = await passwayClient.createSession()
      expect(result).toEqual(true)

      expect(fetchSpy).toHaveBeenNthCalledWith(1, '/v1/user', {
        headers: { 'x-passway-id': passkeyId },
        method: 'GET',
      })

      expect(fetchSpy).toHaveBeenNthCalledWith(2, '/v1/session', {
        credentials: 'include',
        headers: {
          'x-passway-id': passkeyId,
          'x-passway-signature': dataTransform.bufferToBase64(mockSignature),
        },
        method: 'GET',
      })
    })

    test('creates session with reused credentials', async () => {
      const getSpy = vitest.spyOn(navigator.credentials, 'get')
      const fetchSpy = vitest.spyOn(window, 'fetch')

      for (let i = 0; i < 2; i++) {
        vitest.spyOn(dataGenerator, 'getIv').mockResolvedValueOnce(mockIv)
        vitest.spyOn(dataGenerator, 'getSalt').mockResolvedValueOnce(mockSalt)

        vitest.spyOn(crypto, 'generateKeyData').mockResolvedValueOnce({
          encryptedKeys: mockEncryptedKeys,
          privateKey: mockPrivateKey,
          publicKey: mockPublicKey,
        })

        getSpy.mockResolvedValueOnce(mockPublicKeyCredential)

        vitest
          .spyOn(crypto, 'decryptSerializedKeys')
          .mockResolvedValueOnce(mockSerializedKeys)

        vitest
          .spyOn(crypto, 'getSignature')
          .mockResolvedValueOnce(mockSignature)

        fetchSpy
          .mockResolvedValueOnce({
            ...new Response(),
            status: 200,
            json: async () => mockUserGetResponse,
          })
          .mockResolvedValueOnce({
            ...new Response(),
            status: 200,
          })
      }

      const result1 = await passwayClient.createSession()
      expect(result1).toEqual(true)

      const result2 = await passwayClient.createSession()
      expect(result2).toEqual(true)

      expect(fetchSpy).toHaveBeenNthCalledWith(1, '/v1/user', {
        headers: { 'x-passway-id': passkeyId },
        method: 'GET',
      })

      expect(fetchSpy).toHaveBeenNthCalledWith(2, '/v1/session', {
        credentials: 'include',
        headers: {
          'x-passway-id': passkeyId,
          'x-passway-signature': dataTransform.bufferToBase64(mockSignature),
        },
        method: 'GET',
      })

      expect(fetchSpy).toHaveBeenNthCalledWith(3, '/v1/user', {
        headers: { 'x-passway-id': passkeyId },
        method: 'GET',
      })

      expect(fetchSpy).toHaveBeenNthCalledWith(4, '/v1/session', {
        credentials: 'include',
        headers: {
          'x-passway-id': passkeyId,
          'x-passway-signature': dataTransform.bufferToBase64(mockSignature),
        },
        method: 'GET',
      })

      // NOTE: This indicates that credentials were only requested from the
      // user once.
      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    test('handles user retrieval failure response', async () => {
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

      const fetchSpy = vitest.spyOn(window, 'fetch').mockResolvedValueOnce({
        ...new Response(),
        status: 404,
      })

      await expect(async () => {
        await passwayClient.createSession()
      }).rejects.toThrowError(LoginError)

      // NOTE: This indicates that the operation appropriately aborted before
      // the session creation request was made.
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    test('handles session creation failure response', async () => {
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
          status: 400,
        })

      await expect(async () => {
        await passwayClient.createSession()
      }).rejects.toThrowError(LoginError)

      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    test('handles passkey retrieval error', async () => {
      vitest.spyOn(dataGenerator, 'getIv').mockResolvedValueOnce(mockIv)
      vitest.spyOn(dataGenerator, 'getSalt').mockResolvedValueOnce(mockSalt)

      vitest.spyOn(crypto, 'generateKeyData').mockResolvedValueOnce({
        encryptedKeys: mockEncryptedKeys,
        privateKey: mockPrivateKey,
        publicKey: mockPublicKey,
      })

      vitest
        .spyOn(navigator.credentials, 'get')
        .mockRejectedValueOnce(undefined)

      vitest
        .spyOn(crypto, 'decryptSerializedKeys')
        .mockResolvedValueOnce(mockSerializedKeys)

      vitest.spyOn(crypto, 'getSignature').mockResolvedValueOnce(mockSignature)

      const fetchSpy = vitest.spyOn(window, 'fetch')

      await expect(async () => {
        await passwayClient.createSession()
      }).rejects.toThrowError(LoginError)

      // NOTE: This indicates that the operation appropriately aborted before
      // the user data request was made.
      expect(fetchSpy).toHaveBeenCalledTimes(0)
    })
  })

  describe('destroySession', () => {
    test('destroys session', async () => {
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
          status: 200,
        })

      await passwayClient.createSession()

      const result = await passwayClient.destroySession()

      expect(result).toEqual(true)

      expect(fetchSpy).toHaveBeenNthCalledWith(3, '/v1/session', {
        method: 'DELETE',
        credentials: 'include',
      })
    })

    test('handles logout failure', async () => {
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

      vitest
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

      await passwayClient.createSession()

      await expect(async () => {
        await passwayClient.destroySession()
      }).rejects.toThrowError(LogoutError)
    })
  })

  describe('upload', () => {
    test('uploads unencrypted content', async () => {
      const mockFileStringContent = 'mock content'

      const constructorSpy = vi.fn()

      class MockUpload extends Upload {
        constructor(file: Upload['file'], options: UploadOptions) {
          super(file, options)
          constructorSpy(file, options)
        }

        start(): void {
          this.options.onSuccess?.()
        }
      }

      const input = new File([mockFileStringContent], 'text/plain')

      // @ts-expect-error TypeScript assumes the browser implementation of file here,
      // but the Node implementation is what is compatible in the test environment.
      await passwayClient.upload(input, {
        Upload: MockUpload,
        enableEncryption: false,
      })

      const receivedInput: File = constructorSpy.mock.calls[0][0]
      const receivedInputString = await receivedInput.text()

      expect(receivedInputString).toEqual(mockFileStringContent)
    })

    test('uploads encrypted content', async () => {
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

      vitest
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

      await passwayClient.createSession()

      const mockFileStringContent = 'mock content'

      const constructorSpy = vi.fn()

      class MockUpload extends Upload {
        constructor(file: Upload['file'], options: UploadOptions) {
          constructorSpy(file, options)
          super(file, options)
        }

        start(): void {
          this.options.onSuccess?.()
        }
      }

      const input = new File([mockFileStringContent], 'text/plain')

      // @ts-expect-error TypeScript assumes the browser implementation of file here,
      // but the Node implementation is what is compatible in the test environment.
      await passwayClient.upload(input, {
        Upload: MockUpload,
      })

      const receivedData: ReadableStreamDefaultReader =
        constructorSpy.mock.calls[0][0]

      const readerStream = dataTransform.convertReaderToStream(receivedData)

      const decryptedReadableStream = await crypto
        .getKeychain(mockUserHandleString)
        .decryptStream(readerStream)

      const decryptedUploadedData = await dataTransform.streamToString(
        decryptedReadableStream
      )

      expect(decryptedUploadedData).toEqual(mockFileStringContent)
    })

    test('can encrypt data prior to upload', async () => {})

    test('handles upload failure', async () => {})
  })

  describe.skip('listContent', () => {})

  describe.skip('download', () => {})
})
