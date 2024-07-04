import { webcrypto } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'
import { DeepMockProxy } from 'jest-mock-extended'
import { getApp } from '../../../../test/getApp'
import { API_ROOT } from '../../../constants'
import { routeName } from '.'

const endpointRoute = `/${API_ROOT}/v1/${routeName}`

let publicKey = ''
let privateKey = ''

beforeEach(async () => {
  const keypair = await webcrypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  )

  const textDecoder = new TextDecoder()

  publicKey = textDecoder.decode(
    await webcrypto.subtle.exportKey('spki', keypair.publicKey)
  )
  privateKey = textDecoder.decode(
    await webcrypto.subtle.exportKey('pkcs8', keypair.privateKey)
  )
})

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
