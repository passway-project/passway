import { PasskeyCreationError, RegistrationError } from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'

import { PasswayClient, SerializedKeys } from '.'

let passwayClient = new PasswayClient({ apiRoot: '' })

const mockUserHandle = dataGenerator.getRandomUint8Array(1)
const passkeyId = 'abc123'
const mockIv = new Uint8Array(12)
const mockSalt = new Uint8Array(16)
const mockEncryptedKeys = 'encrypted keys'
const mockPrivateKey = 'private key'
const mockPublicKey = 'public key'

beforeEach(() => {
  passwayClient = new PasswayClient({ apiRoot: '' })
})

describe('PasswayClient', () => {
  describe('createPasskey', async () => {
    test('creates a passkey', async () => {
      const createSpy = vitest
        .spyOn(navigator.credentials, 'create')
        .mockResolvedValueOnce({
          id: 'id',
          type: 'type',
        })

      const stubRegistrationConfig = {
        appName: 'appName',
        userDisplayName: 'User',
        userName: 'user-name',
      }

      await passwayClient.createPasskey(stubRegistrationConfig)

      expect(createSpy).toHaveBeenCalledWith({
        publicKey: {
          challenge: expect.any(Uint8Array),
          rp: {
            name: stubRegistrationConfig.appName,
          },
          user: {
            id: expect.any(Uint8Array),
            name: stubRegistrationConfig.userName,
            displayName: stubRegistrationConfig.userDisplayName,
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

      const stubRegistrationConfig = {
        appName: 'appName',
        userDisplayName: 'User',
        userName: 'user-name',
      }

      await expect(async () => {
        await passwayClient.createPasskey(stubRegistrationConfig)
      }).rejects.toThrowError(PasskeyCreationError)
    })
  })

  describe('createUser', async () => {
    test('creates user', async () => {
      const mockAuthenticatorAssertionResponse = Object.assign(
        new window.AuthenticatorAssertionResponse(),
        {
          authenticatorData: dataGenerator.getRandomUint8Array(1),
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
        .mockReturnValueOnce(
          Promise.resolve({ ...new Response(), status: 201 })
        )

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
      const mockAuthenticatorAssertionResponse = Object.assign(
        new window.AuthenticatorAssertionResponse(),
        {
          authenticatorData: dataGenerator.getRandomUint8Array(1),
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
        .mockReturnValueOnce(
          Promise.resolve({ ...new Response(), status: 500 })
        )

      await expect(async () => {
        await passwayClient.createUser()
      }).rejects.toThrowError(RegistrationError)
    })
  })

  describe('createSession', async () => {
    test('creates session with fresh credentials', async () => {
      const mockAuthenticatorAssertionResponse = Object.assign(
        new window.AuthenticatorAssertionResponse(),
        {
          authenticatorData: dataGenerator.getRandomUint8Array(1),
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

      const mockSerializedKeys: SerializedKeys = {
        encryptionKey: mockEncryptedKeys,
        salt: dataTransform.bufferToBase64(mockSalt),
        iv: dataTransform.bufferToBase64(mockIv),
        signatureKeys: {
          privateKey: 'private signature key',
          publicKey: 'public signature key',
        },
      }

      vitest
        .spyOn(crypto, 'decryptSerializedKeys')
        .mockResolvedValueOnce(mockSerializedKeys)

      const mockSignature = dataGenerator.getRandomUint8Array(1)
      vitest.spyOn(crypto, 'getSignature').mockResolvedValueOnce(mockSignature)

      const fetchSpy = vitest
        .spyOn(window, 'fetch')
        .mockReturnValueOnce(
          Promise.resolve({
            ...new Response(),
            status: 200,
            json: async () => {
              return {
                user: {
                  keys: mockEncryptedKeys,
                  salt: dataTransform.bufferToBase64(mockSalt),
                  iv: dataTransform.bufferToBase64(mockIv),
                },
              }
            },
          })
        )
        .mockReturnValueOnce(
          Promise.resolve({
            ...new Response(),
            status: 200,
          })
        )

      const result = await passwayClient.createSession()
      expect(result).toEqual(true)

      expect(fetchSpy).toHaveBeenNthCalledWith(1, '/v1/user', {
        headers: { 'x-user-id': passkeyId },
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

    test.skip('creates session with reused credentials', async () => {})

    test.skip('handles session creation failure due to failure response', async () => {})

    test.skip('handles session creation failure due to passkey retrieval error', async () => {})
  })

  describe.skip('destroySession', async () => {
    // FIXME: Add tests
  })
})
