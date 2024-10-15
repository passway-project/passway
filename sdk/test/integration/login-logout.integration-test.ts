import { PasswayClient } from '../../src'
import {
  mockCreatePublicKeyCredential,
  mockGetPublicKeyCredential,
} from '../utils/mocks'

describe('login and logout', () => {
  test('user can be created and then log in and log out', async () => {
    vitest
      .spyOn(navigator.credentials, 'create')
      .mockResolvedValue(mockCreatePublicKeyCredential)

    vitest
      .spyOn(navigator.credentials, 'get')
      .mockResolvedValue(mockGetPublicKeyCredential)

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
