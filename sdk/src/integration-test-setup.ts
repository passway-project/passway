vi.mock(
  'global/window',
  async (importOriginal): Promise<Partial<Window & typeof globalThis>> => {
    const originalWindow =
      await importOriginal<typeof import('global/window')>()

    return {
      ...originalWindow,
      // @ts-expect-error This is all that's needed for the tests
      navigator: {
        credentials: {
          create: vi.fn(),
          get: vi.fn(),
          preventSilentAccess: vi.fn(),
          store: vi.fn(),
        },
      },
      // @ts-expect-error This object is not defined in the test environment
      AuthenticatorAttestationResponse: class {},
      // @ts-expect-error This object is not defined in the test environment
      AuthenticatorAssertionResponse: class {},
      // @ts-expect-error This object is not defined in the test environment
      PublicKeyCredential: class {},

      Blob,
      File,
    }
  }
)
