import { RegistrationError } from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'

import { PasswayClient } from '.'

let passwayClient = new PasswayClient({ apiRoot: '' })

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
      vitest.spyOn(navigator.credentials, 'create').mockRejectedValueOnce({})

      const stubRegistrationConfig = {
        appName: 'appName',
        userDisplayName: 'User',
        userName: 'user-name',
      }

      await expect(async () => {
        await passwayClient.createPasskey(stubRegistrationConfig)
      }).rejects.toThrowError(RegistrationError)
    })
  })

  describe('createUser', async () => {
    test('creates user', async () => {
      const mockUserHandle = dataGenerator.getRandomUint8Array(1)
      const mockAuthenticatorAssertionResponse = Object.assign(
        new window.AuthenticatorAssertionResponse(),
        {
          authenticatorData: dataGenerator.getRandomUint8Array(1),
          clientDataJSON: dataGenerator.getRandomUint8Array(1),
          signature: dataGenerator.getRandomUint8Array(1),
          userHandle: mockUserHandle,
        }
      )

      const passkeyId = 'abc123'
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

      const mockIv = new Uint8Array(12)
      vitest.spyOn(dataGenerator, 'getIv').mockResolvedValueOnce(mockIv)

      const mockSalt = new Uint8Array(16)
      vitest.spyOn(dataGenerator, 'getSalt').mockResolvedValueOnce(mockSalt)

      const mockEncryptedKeys = 'encrypted keys'
      const mockPrivateKey = 'private key'
      const mockPublicKey = 'public key'

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
          Promise.resolve({ ...new Response(), status: 200 })
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
  })

  describe.skip('createSession', async () => {
    // FIXME: Add tests
  })

  describe.skip('destroySession', async () => {
    // FIXME: Add tests
  })
})
