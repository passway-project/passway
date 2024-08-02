export * from './types'
import { PasskeyConfig, PutUserBody, isGetUserResponse } from './types'
import { LoginError, RegistrationError } from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'

interface PasswayClientConfig {
  apiRoot: string
}

export class PasswayClient {
  readonly apiRoot: string

  constructor({ apiRoot }: PasswayClientConfig) {
    this.apiRoot = apiRoot
  }

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

  createUser = async () => {
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
      {
        challenge: dataGenerator.getRandomUint8Array(64),
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

      const putUserResponse = await fetch(`${this.apiRoot}/v1/user`, {
        method: 'PUT',
        body: JSON.stringify(putUserBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const { status } = putUserResponse

      console.log({ status })
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }

  createSession = async () => {
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
      {
        challenge: dataGenerator.getRandomUint8Array(64),
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

      //const userHandleBase64 = dataTransform.bufferToBase64(userHandle)

      const getUserResponse = await fetch(`${this.apiRoot}/v1/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': id,
        },
      })

      const { status } = getUserResponse

      if (status !== 200) {
        throw new Error(
          `Received error from ${this.apiRoot}/v1/user: ${status}`
        )
      }

      const bodyJson = await getUserResponse.json()

      if (!isGetUserResponse(bodyJson)) {
        throw new TypeError(
          `Unexpected response from ${this.apiRoot}/v1/user: ${JSON.stringify(bodyJson)}`
        )
      }

      // FIXME: Create session
      console.log({ status, bodyJson })
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }
}
