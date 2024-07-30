const getRandomUint8Array = (length: number) => {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return array
}

export interface RegistrationConfig {
  appName: string
  userName: string
  userDisplayName: string
}

const getRegistrationOptions = ({
  appName,
  userName,
  userDisplayName,
}: RegistrationConfig) => {
  const registrationOptions: CredentialCreationOptions['publicKey'] = {
    challenge: getRandomUint8Array(64),
    rp: {
      name: appName,
    },
    user: {
      id: getRandomUint8Array(64),
      name: userName,
      displayName: userDisplayName,
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
  return registrationOptions
}

export class PasswayClient {
  initiateRegistration = async (registrationConfig: RegistrationConfig) => {
    const credential = await navigator.credentials.create({
      publicKey: getRegistrationOptions(registrationConfig),
    })

    console.log({ credential })
  }
}

export const passwayClient = new PasswayClient()
