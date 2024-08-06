import { RegistrationError } from './errors'

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

  describe.skip('createUser', async () => {
    // FIXME: Add tests
  })

  describe.skip('createSession', async () => {
    // FIXME: Add tests
  })

  describe.skip('destroySession', async () => {
    // FIXME: Add tests
  })
})
