import { PrismaClient, User } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'
import { routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

describe(endpointRoute, () => {
  test('handles nonexistent user lookup', async () => {
    const app = getApp()
    const passkeyId = 'foo'

    ;(
      app.prisma as DeepMockProxy<PrismaClient>
    ).user.findFirstOrThrow.mockRejectedValueOnce(new Error())

    const response = await app.inject({
      method: 'POST',
      url: endpointRoute,
      body: { id: passkeyId },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: false })
    expect(response.statusCode).toEqual(StatusCodes.NOT_FOUND)
  })
})
