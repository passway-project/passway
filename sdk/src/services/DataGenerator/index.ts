import { RegistrationConfig } from '../../types'

export class DataGeneratorService {
  getRandomUint8Array = (length: number) => {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return array
  }

  getRegistrationOptions = ({
    appName,
    userName,
    userDisplayName,
  }: RegistrationConfig) => {
    const registrationOptions: CredentialCreationOptions['publicKey'] = {
      challenge: dataGenerator.getRandomUint8Array(64),
      rp: {
        name: appName,
      },
      user: {
        id: dataGenerator.getRandomUint8Array(64),
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
}

export const dataGenerator = new DataGeneratorService()
