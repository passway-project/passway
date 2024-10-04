import { API_ROOT } from '../../../constants'
import { requestAuthenticatedSession } from '../../../../test/utils/session'
import {
  getStubUser,
  hydrateMockUser,
  stubKeyData,
  stubUserId,
} from '../../../../test/stubs'
import { getApp } from '../../../../test/utils/getApp'
import { hydrateMockKeyData } from '../../../../test/utils/getMockKeyData'

import { routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

const mockKeyData = stubKeyData()
const mockUser = getStubUser()

beforeAll(async () => {
  await hydrateMockKeyData(mockKeyData)
  hydrateMockUser(mockUser, mockKeyData)
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
