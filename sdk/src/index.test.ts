import { RegistrationError } from './errors'

import { dataGenerator } from './services/DataGenerator'

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
      const mockAuthenticatorAssertionResponse = Object.assign(
        new window.AuthenticatorAssertionResponse(),
        {
          authenticatorData: dataGenerator.getRandomUint8Array(1),
          clientDataJSON: dataGenerator.getRandomUint8Array(1),
          signature: dataGenerator.getRandomUint8Array(1),
          userHandle: dataGenerator.getRandomUint8Array(1),
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

      vitest
        .spyOn(navigator.credentials, 'get')
        .mockResolvedValueOnce(mockPublicKeyCredential)

      const fetchSpy = vitest
        .spyOn(window, 'fetch')
        .mockReturnValueOnce(
          Promise.resolve({ ...new Response(), status: 200 })
        )
        .mockReturnValueOnce(
          Promise.resolve({ ...new Response(), status: 200 })
        )

      await passwayClient.createUser()

      expect(fetchSpy).toHaveBeenCalledWith(`/v1/user`, {
        method: 'PUT',
        body: expect.any(String),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const body = String(fetchSpy.mock.calls[0][1]?.body)

      expect(JSON.parse(body)).toEqual({
        id: passkeyId,
        salt: expect.any(String),
        iv: expect.any(String),
        encryptedKeys: expect.any(String),
        publicKey: expect.any(String),
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
