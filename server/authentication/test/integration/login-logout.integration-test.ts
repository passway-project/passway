import { StatusCodes } from 'http-status-codes'
import { buildApp } from '../../src/app'
import { API_ROOT } from '../../src/constants'
import { routeName as userRouteName } from '../../src/routes/v1/user'
import { getKeypair } from '../getKeypair'
import { getStubKeyData } from '../getStubKeyData'
import { redisClient } from '../../src/cache'
import fastify, { FastifyInstance } from 'fastify'
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
  test('user can log in and log out', async () => {
    const passkeyId = 'foo'
    const stubKeyData = await getStubKeyData(stubUserPasskeySecret)

    const response = await app.inject({
      method: 'PUT',
      url: `/${API_ROOT}/v1/${userRouteName}`,
      body: {
        id: passkeyId,
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubKeyData.publicKey,
      },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })
    expect(response.statusCode).toEqual(StatusCodes.CREATED)

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

    // FIXME: Destroy session
  })
})
