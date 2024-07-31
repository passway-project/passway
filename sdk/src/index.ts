import { LoginError, RegistrationError } from './errors'

const stringToUintArray = (str: string) => {
  const textEncoder = new TextEncoder()
  const uint8Array = textEncoder.encode(str)

  return uint8Array
}

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
  private static staticChallenge = '410fcb33-c3d8-470e-968f-7072d1572deb'

  register = async (registrationConfig: RegistrationConfig) => {
    try {
      await navigator.credentials.create({
        publicKey: getRegistrationOptions(registrationConfig),
      })
    } catch (e) {
      console.error(e)
      throw new RegistrationError()
    }

    return true
  }

  login = async () => {
    const authenticationOptions = {
      challenge: stringToUintArray(PasswayClient.staticChallenge),
      timeout: 60000,
    }

    try {
      const retrievedCredential = await navigator.credentials.get({
        publicKey: authenticationOptions,
      })

      console.log({ retrievedCredential })
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }
}

export const passwayClient = new PasswayClient()
