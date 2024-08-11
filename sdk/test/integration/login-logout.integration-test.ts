import { PasswayClient } from '../../src'
import { dataGenerator } from '../../src/services/DataGenerator'

const mockUserHandle = dataGenerator.getRandomUint8Array(64)
const stubPasskeyId = 'b1KMe302QMK9sduTOjKK9w'
const stubRawId = dataGenerator.getRandomUint8Array(16)

const mockAuthenticatorAssertionResponse = Object.assign(
  new window.AuthenticatorAssertionResponse(),
  {
    clientDataJSON: dataGenerator.getRandomUint8Array(181),
    signature: dataGenerator.getRandomUint8Array(70),
    userHandle: mockUserHandle,
  }
)

const stubPublicKeyCredential = Object.assign(
  new window.PublicKeyCredential(),
  {
    id: stubPasskeyId,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => {
      throw new Error()
    },
    rawId: stubRawId,
    response: mockAuthenticatorAssertionResponse,
  }
)

describe('login and logout', () => {
  test('user can be created and then log in and log out', async () => {
    vitest
      .spyOn(navigator.credentials, 'create')
      .mockResolvedValue(stubPublicKeyCredential)

    vitest
      .spyOn(navigator.credentials, 'get')
      .mockResolvedValue(stubPublicKeyCredential)

    const passwayClient = new PasswayClient({ apiRoot: 'http://api:3000/api' })

    await passwayClient.createPasskey({
      appName: 'integration-test',
      userDisplayName: 'Test User',
      userName: 'test-user',
    })

    const createUserResult = await passwayClient.createUser()
    expect(createUserResult).toEqual(true)

    const createSessionResult = await passwayClient.createSession()
    expect(createSessionResult).toEqual(true)

    const destroySessionResult = await passwayClient.destroySession()
    expect(destroySessionResult).toEqual(true)
  })
})
