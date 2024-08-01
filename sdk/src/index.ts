export * from './types'
import { LoginConfig, PasskeyConfig, PutUserBody } from './types'
import { LoginError, RegistrationError } from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'

export class PasswayClient {
  private static staticChallenge = '410fcb33-c3d8-470e-968f-7072d1572deb'

  createPasskey = async (registrationConfig: PasskeyConfig) => {
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

  createUser = async ({ apiRoot }: LoginConfig) => {
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
      {
        challenge: dataTransform.stringToUintArray(
          PasswayClient.staticChallenge
        ),
        timeout: 60000,
      }

    try {
      const retrievedCredential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })

      if (!(retrievedCredential instanceof PublicKeyCredential)) {
        throw new TypeError()
      }

      const { response, id } = retrievedCredential

      if (!(response instanceof AuthenticatorAssertionResponse)) {
        throw new TypeError()
      }

      const { userHandle } = response

      if (userHandle === null) {
        throw new TypeError()
      }

      const userHandleBase64 = dataTransform.bufferToBase64(userHandle)

      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const ivBase64 = dataTransform.bufferToBase64(iv)

      const salt = window.crypto.getRandomValues(new Uint8Array(16))
      const saltBase64 = dataTransform.bufferToBase64(salt)

      const { encryptedKeys, publicKey } = await crypto.generateKeyData(
        userHandleBase64,
        iv,
        salt
      )

      const putUserBody: PutUserBody = {
        id,
        salt: saltBase64,
        iv: ivBase64,
        encryptedKeys,
        publicKey,
      }

      const putUserResponse = await fetch(`${apiRoot}/v1/user`, {
        method: 'PUT',
        body: JSON.stringify(putUserBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const body = await putUserResponse.json()

      console.log({ body })
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }
}

export const passwayClient = new PasswayClient()
