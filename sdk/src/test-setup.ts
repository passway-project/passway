import nodeFetch from 'node-fetch'
import fetchCookie from 'fetch-cookie'

// @ts-expect-error This is a polyfill that enables cookies to be automatically
// used across fetch requests as they would in a browser.
window.fetch = fetchCookie(nodeFetch)

Object.assign(navigator, {
  credentials: {
    create: vi.fn(),
    get: vi.fn(),
    preventSilentAccess: vi.fn(),
    store: vi.fn(),
  },
})

// @ts-expect-error This object is not defined in the test environment
window.AuthenticatorAssertionResponse = class {}

// @ts-expect-error This object is not defined in the test environment
window.PublicKeyCredential = class {}
