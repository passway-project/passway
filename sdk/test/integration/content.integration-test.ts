import window from 'global/window'

import { PasswayClient } from '../../src'
import { dataTransform } from '../../src/services/DataTransform'
import {
  generateMockAuthenticatorAssertionResponse,
  generateMockCreatePublicKeyCredential,
  generateMockGetPublicKeyCredential,
  generateMockPasskeyId,
  generateMockRawId,
  generateMockUserHandle,
  mockFileStringContent,
} from '../utils/mocks'
import { cookieJar } from '../utils/cookie-jar'

describe('content', () => {
  test('content can be encrypted, uploaded, downloaded, and decrypted', async () => {
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

    const input = new window.File([mockFileStringContent], 'text/plain')

    await passwayClient.createUser()
    await passwayClient.createSession()

    const sessionCookieString =
      await cookieJar.getCookieString('http://api:3000')

    // NOTE: This is necessary because the test environment uses node-fetch and
    // TUS uses XMLHttpRequest, and they don't share cookies automatically
    // (unlike in a browser where they would).
    //
    // @ts-expect-error The JSDOM type definition is missing this part of the API
    jsdom.cookieJar.setCookie(sessionCookieString, 'http://api:3000/api')

    await passwayClient.upload(input)
    const [{ contentId }] = await passwayClient.listContent()
    const downloadedData = await passwayClient.download(contentId)

    const downloadedDataString =
      await dataTransform.streamToString(downloadedData)

    expect(downloadedDataString).toEqual(mockFileStringContent)
  })
})
