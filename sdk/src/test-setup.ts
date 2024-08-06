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
