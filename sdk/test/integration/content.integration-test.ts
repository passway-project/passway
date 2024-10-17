import window from 'global/window'

import { PasswayClient } from '../../src'
import { dataTransform } from '../../src/services/DataTransform'
import {
  generateMockCreatePublicKeyCredential,
  mockFileStringContent,
  mockGetPublicKeyCredential,
} from '../utils/mocks'

describe('content', () => {
  // FIXME:Make this pass
  test.skip('content can be encrypted, uploaded, downloaded, and decrypted', async () => {
    const mockCreatePublicKeyCredential =
      generateMockCreatePublicKeyCredential()

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
    await passwayClient.upload(input)
    const [{ contentId }] = await passwayClient.listContent()
    const downloadedData = await passwayClient.download(contentId)

    const downloadedDataString =
      await dataTransform.streamToString(downloadedData)

    expect(downloadedDataString).toEqual(mockFileStringContent)
  })
})
