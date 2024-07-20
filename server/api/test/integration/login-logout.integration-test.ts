import { StatusCodes } from 'http-status-codes'
import fastify, { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app'
import { API_ROOT, sessionKeyName } from '../../src/constants'
import {
  UserGetApi,
  isUserGetSuccessResponse,
  routeName as userRouteName,
} from '../../src/routes/v1/user'
import { getStubKeyData } from '../getStubKeyData'
import { redisClient } from '../../src/cache'
import { decryptSerializedKeys, getSignature } from '../utils/crypto'
import {
  routeName as sessionRouteName,
  signatureMessage,
} from '../../src/routes/v1/session'

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
    const passkeySecret = 'abc123'

    // NOTE: These stub values MUST only be used for test setup here and NOT
    // decryption in order for this integration test to be valid.
    const stubIv = crypto.getRandomValues(new Uint8Array(12))
    const stubSalt = crypto.getRandomValues(new Uint8Array(16))
    const stubKeyData = await getStubKeyData(passkeySecret, stubIv, stubSalt)

    // STEP 1: Create user.
    const putUserResponse = await app.inject({
      method: 'PUT',
      url: `/${API_ROOT}/v1/${userRouteName}`,
      body: {
        id: passkeyId,
        iv: Buffer.from(stubIv).toString('base64'),
        salt: Buffer.from(stubSalt).toString('base64'),
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubKeyData.publicKey,
      },
    })

    // NOTE:: Stub values MUST NOT be used after this point in the test.

    expect(putUserResponse.statusCode).toEqual(StatusCodes.CREATED)

    // STEP 2: Assuming a subsequent user session, request user metadata with
    // just the client-side passkey ID available.
    const getUserResponse = await app.inject({
      method: 'GET',
      url: `/${API_ROOT}/v1/${userRouteName}`,
      headers: {
        'x-user-id': passkeyId,
      },
    })

    expect(getUserResponse.statusCode).toEqual(StatusCodes.OK)

    const bodyJson: UserGetApi['Reply'] = await getUserResponse.json()

    // NOTE: This is just enabling accurate type inference below.
    if (!isUserGetSuccessResponse(bodyJson)) {
      throw new Error()
    }

    const {
      user: { iv, keys, salt },
    } = bodyJson

    // STEP 3: With the client-owned passkey secret and server-owned user
    // metadata now with the client, combine them to reveal private keys.
    const serializedKeys = await decryptSerializedKeys(
      keys,
      passkeySecret,
      iv,
      salt
    )

    // STEP 4: Produce signature data to identify the user with.
    const signature = await getSignature(signatureMessage, {
      privateKey: serializedKeys.signatureKeys.privateKey,
    })

    // STEP 5: Exchange the signature with the server for a session token.
    const getSessionResponse = await app.inject({
      method: 'GET',
      url: `/${API_ROOT}/v1/${sessionRouteName}`,
      headers: {
        'x-passway-id': passkeyId,
        'x-passway-signature': Buffer.from(signature).toString('base64'),
      },
    })

    expect(getSessionResponse.statusCode).toEqual(StatusCodes.OK)

    // STEP 6: Now that an authenticated session has been created, destroy it.
    const deleteSessionRequst = await app.inject({
      method: 'DELETE',
      url: `/${API_ROOT}/v1/${sessionRouteName}`,
      cookies: {
        [sessionKeyName]: getSessionResponse.cookies[0].value,
      },
    })

    expect(deleteSessionRequst.statusCode).toEqual(StatusCodes.OK)
  })
})
