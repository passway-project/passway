import { RegistrationConfig } from './types'
import { LoginError, RegistrationError } from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'

export class PasswayClient {
  private static staticChallenge = '410fcb33-c3d8-470e-968f-7072d1572deb'

  register = async (registrationConfig: RegistrationConfig) => {
    try {
      await navigator.credentials.create({
        publicKey: dataGenerator.getRegistrationOptions(registrationConfig),
      })
    } catch (e) {
      console.error(e)
      throw new RegistrationError()
    }

    return true
  }

  login = async () => {
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: dataTransform.stringToUintArray(PasswayClient.staticChallenge),
      timeout: 60000,
    }

    try {
      const retrievedCredential = await navigator.credentials.get({
        publicKey,
      })

      console.log({ retrievedCredential })
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }
}

export const passwayClient = new PasswayClient()
