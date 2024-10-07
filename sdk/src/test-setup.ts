import { File, Blob } from 'node:buffer'

import nodeFetch from 'node-fetch'
import fetchCookie from 'fetch-cookie'

// @ts-expect-error Necessary patch for Node-based test environment
global.File = File
// @ts-expect-error Necessary patch for Node-based test environment
global.Blob = Blob

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
window.AuthenticatorAttestationResponse = class {}

// @ts-expect-error This object is not defined in the test environment
window.AuthenticatorAssertionResponse = class {}

// @ts-expect-error This object is not defined in the test environment
window.PublicKeyCredential = class {}

// See: https://github.com/vitest-dev/vitest/issues/4043#issuecomment-2383567554
//
// JSDom + Vitest don't play well with each other. Long story short - default
// TextEncoder produces Uint8Array objects that are _different_ from the global
// Uint8Array objects, so some functions that compare their types explode.
// https://github.com/vitest-dev/vitest/issues/4043#issuecomment-1905172846
class ESBuildAndJSDOMCompatibleTextEncoder extends TextEncoder {
  constructor() {
    super()
  }

  encode(input: string) {
    if (typeof input !== 'string') {
      throw new TypeError('`input` must be a string')
    }

    const decodedURI = decodeURIComponent(encodeURIComponent(input))
    const arr = new Uint8Array(decodedURI.length)
    const chars = decodedURI.split('')
    for (let i = 0; i < chars.length; i++) {
      arr[i] = decodedURI[i].charCodeAt(0)
    }
    return arr
  }
}

global.TextEncoder = ESBuildAndJSDOMCompatibleTextEncoder
