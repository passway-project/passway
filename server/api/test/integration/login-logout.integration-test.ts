import { StatusCodes } from 'http-status-codes'
import fastify, { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app'
import { API_ROOT } from '../../src/constants'
import {
  UserGetApi,
  isUserGetSuccessResponse,
  routeName as userRouteName,
} from '../../src/routes/v1/user'
import { getStubKeyData } from '../getStubKeyData'
import { redisClient } from '../../src/cache'
import { getSignature } from '../utils/crypto'
import {
  routeName as sessionRouteName,
  signatureMessage,
} from '../../src/routes/v1/session'

const stubUserPasskeySecret = 'abc123'

let app: FastifyInstance = fastify()

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  await app.close()
  redisClient.disconnect()
})

describe('login and logout', () => {
  test('user can be created and then log in and log out', async () => {
    const passkeyId = 'foo'
    const stubKeyData = await getStubKeyData(stubUserPasskeySecret)

    const putUserResponse = await app.inject({
      method: 'PUT',
      url: `/${API_ROOT}/v1/${userRouteName}`,
      body: {
        id: passkeyId,
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubKeyData.publicKey,
      },
    })

    expect(putUserResponse.statusCode).toEqual(StatusCodes.CREATED)

    const getUserResponse = await app.inject({
      method: 'GET',
      url: `/${API_ROOT}/v1/${userRouteName}`,
      headers: {
        'x-user-id': passkeyId,
      },
    })

    expect(getUserResponse.statusCode).toEqual(StatusCodes.OK)

    const bodyJson: UserGetApi['Reply'] = await getUserResponse.json()

    if (!isUserGetSuccessResponse(bodyJson)) {
      throw new Error()
    }

    // FIXME: Derive the private key from bodyJson
    const signature = await getSignature(signatureMessage, {
      privateKey: stubKeyData.privateKey,
    })

    const signatureHeader = Buffer.from(signature).toString('base64')

    const getSessionResponse = await app.inject({
      method: 'GET',
      url: `/${API_ROOT}/v1/${sessionRouteName}`,
      headers: {
        'x-passway-id': passkeyId,
        'x-passway-signature': signatureHeader,
      },
    })

    expect(getSessionResponse.statusCode).toEqual(StatusCodes.OK)

    const deleteSessionRequst = await app.inject({
      method: 'DELETE',
      url: `/${API_ROOT}/v1/${sessionRouteName}`,
      cookies: {
        sessionId: getSessionResponse.cookies[0].value,
      },
    })

    expect(deleteSessionRequst.statusCode).toEqual(StatusCodes.OK)
  })
})
