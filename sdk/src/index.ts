const getRandomUint8Array = (length: number) => {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return array
}

const registrationOptions: CredentialCreationOptions['publicKey'] = {
  challenge: getRandomUint8Array(64),
  rp: {
    name: 'Example Corp',
  },
  user: {
    id: getRandomUint8Array(64),
    name: 'example-user',
    displayName: 'Example User',
  },
  pubKeyCredParams: [
    {
      type: 'public-key',
      // NOTE: See https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#alg
      alg: -7, // ES256
    },
  ],
  authenticatorSelection: {
    userVerification: 'preferred',
    requireResidentKey: false,
    residentKey: 'preferred',
  },
  timeout: 60000,
}

export class PasswayClient {
  initiateRegistration = async () => {
    const credential = await navigator.credentials.create({
      publicKey: registrationOptions,
    })
    console.log({ credential })
  }
}

export const passwayClient = new PasswayClient()
