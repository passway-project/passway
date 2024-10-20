import window from 'global/window'

import { PasswayClient } from '../../src'
import {
  generateMockAuthenticatorAssertionResponse,
  generateMockCreatePublicKeyCredential,
  generateMockGetPublicKeyCredential,
  generateMockPasskeyId,
  generateMockRawId,
  generateMockUserHandle,
} from '../utils/mocks'

describe('login and logout', () => {
  test('user can be created and then log in and log out', async () => {
    const mockUserHandle = generateMockUserHandle()
    const mockPasskeyId = generateMockPasskeyId()
    const mockRawId = generateMockRawId()

    const mockAuthenticatorAssertionResponse =
      generateMockAuthenticatorAssertionResponse({ userHandle: mockUserHandle })

    const mockCreatePublicKeyCredential = generateMockCreatePublicKeyCredential(
      {
        id: mockPasskeyId,
        rawId: mockRawId,
      }
    )

    const mockGetPublicKeyCredential = generateMockGetPublicKeyCredential({
      id: mockPasskeyId,
      rawId: mockRawId,
      response: mockAuthenticatorAssertionResponse,
    })

    vitest
      .spyOn(window.navigator.credentials, 'create')
      .mockResolvedValue(mockCreatePublicKeyCredential)

    vitest
      .spyOn(window.navigator.credentials, 'get')
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
