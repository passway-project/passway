import { API_ROOT } from '../../../constants'

import { requestAuthenticatedSession } from '../../../../test/utils/session'
import {
  getMockUser,
  stubKeyData,
  stubIv,
  stubSalt,
  stubUserId,
  stubUserPasskeySecret,
} from '../../../../test/stubs'

import { getApp } from '../../../../test/utils/getApp'

import { getMockKeyData } from '../../../../test/utils/getMockKeyData'

import { routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const mockKeyData = stubKeyData()
const mockUser = getMockUser(mockKeyData)

beforeAll(async () => {
  Object.assign(
    mockKeyData,
    await getMockKeyData(stubUserPasskeySecret, stubIv, stubSalt)
  )

  mockUser.publicKey = mockKeyData.publicKey
  mockUser.encryptedKeys = mockKeyData.encryptedKeys
})

describe(endpointRoute, () => {
  describe(`/${routeName}/list`, () => {
    describe('GET', () => {
      test.skip('lists content', async () => {
        const app = getApp()

        const sessionResponse = await requestAuthenticatedSession(app, {
          userId: stubUserId,
          ...mockKeyData,
        })

        // FIXME: Write the rest of this test
        console.log(sessionResponse)
      })
    })
  })
})
