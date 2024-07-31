export * from './types'
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

      if (!(retrievedCredential instanceof PublicKeyCredential)) {
        throw new TypeError()
      }

      const { response } = retrievedCredential

      if (!(response instanceof AuthenticatorAssertionResponse)) {
        throw new TypeError()
      }

      const { userHandle, signature } = response

      if (userHandle === null) {
        throw new TypeError()
      }

      const userHandleBase64 = dataTransform.bufferToBase64(userHandle)
      const signatureBase64 = dataTransform.bufferToBase64(signature)

      // FIXME: Remove this
      console.log({
        retrievedCredential,
        userHandleString: userHandleBase64,
        signatureString: signatureBase64,
      })
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }
}

export const passwayClient = new PasswayClient()
