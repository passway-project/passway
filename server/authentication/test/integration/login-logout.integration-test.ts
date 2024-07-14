import { StatusCodes } from 'http-status-codes'
import { buildApp } from '../../src/app'
import { API_ROOT } from '../../src/constants'
import { routeName as userRouteName } from '../../src/routes/v1/user'
import { getKeypair } from '../getKeypair'
import { getStubKeyData } from '../getStubKeyData'
import { redisClient } from '../../src/cache'

const stubUserPasskeySecret = 'abc123'

afterAll(async () => {
  redisClient.disconnect()
})

describe('login and logout', () => {
  test('user can log in and log out', async () => {
    const app = await buildApp()
    const keypair = await getKeypair()
    const stubUserPublicKeyData = btoa(keypair.publicKey)
    const stubKeyData = await getStubKeyData(stubUserPasskeySecret)

    const passkeyId = 'foo'

    const response = await app.inject({
      method: 'PUT',
      url: `/${API_ROOT}/v1/${userRouteName}`,
      body: {
        id: passkeyId,
        encryptedKeys: stubKeyData.encryptedKeys,
        publicKey: stubUserPublicKeyData,
      },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })
    expect(response.statusCode).toEqual(StatusCodes.CREATED)

    // FIXME: Get session
    // FIXME: Destroy session

    await app.close()
  })
})
