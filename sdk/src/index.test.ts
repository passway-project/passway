import { RegistrationError } from './errors'

import { dataGenerator } from './services/DataGenerator'

import { PasswayClient } from '.'

let passwayClient = new PasswayClient({ apiRoot: '' })

beforeAll(() => {
  Object.assign(navigator, {
    credentials: {
      create: vi.fn(),
      get: vi.fn(),
      preventSilentAccess: vi.fn(),
      store: vi.fn(),
    },
  })
})

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
      // @ts-expect-error This object is not defined in the test environment
      window.AuthenticatorAssertionResponse = class {}

      const mockAuthenticatorAssertionResponse = Object.assign(
        new AuthenticatorAssertionResponse(),
        {
          authenticatorData: dataGenerator.getRandomUint8Array(1),
          clientDataJSON: dataGenerator.getRandomUint8Array(1),
          signature: dataGenerator.getRandomUint8Array(1),
          userHandle: dataGenerator.getRandomUint8Array(1),
        }
      )

      // @ts-expect-error This object is not defined in the test environment
      window.PublicKeyCredential = class {}

      const mockPublicKeyCredential = Object.assign(new PublicKeyCredential(), {
        authenticatorAttachment: '',
        getClientExtensionResults: () => {
          throw new Error()
        },
        id: '',
        rawId: dataGenerator.getRandomUint8Array(1),
        response: mockAuthenticatorAssertionResponse,
        type: '',
      })

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

      // FIXME: Validate what fetch responsded with
      expect(fetchSpy).toHaveResolved()

      // FIXME: Validate the rest of the operation
    })
  })

  describe.skip('createSession', async () => {
    // FIXME: Add tests
  })

  describe.skip('destroySession', async () => {
    // FIXME: Add tests
  })
})
