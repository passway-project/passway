import fastify, { FastifyInstance } from 'fastify'
import { buildApp } from '../../../app'
import { API_ROOT } from '../../../constants'

// FIXME: Move this to a setup file
let app: FastifyInstance = fastify()

beforeEach(async () => {
  app = await buildApp()
})

afterEach(async () => {
  app.close()
})

const endpointRoute = `/${API_ROOT}/v1/user`

// FIXME: Silence logs for tests
// FIXME: Mock the database

describe(endpointRoute, () => {
  test('creates a user', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: endpointRoute,
      body: { id: 'foo' },
    })

    const bodyJson = await response.json()

    expect(bodyJson).toEqual({ success: true })

    // FIXME: Expect 200 response
  })
})
