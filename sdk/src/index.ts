export * from './types'
import { paths } from './schema'
import { PasskeyConfig, PutUserBody, isGetUserResponse } from './types'
import { LoginError, RegistrationError } from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'
import { signatureMessage } from './constants'

interface PasswayClientConfig {
  apiRoot: string
}

export class PasswayClient {
  readonly apiRoot: string

  private passkeyId: string | null = null
  private userHandle: ArrayBuffer | null = null

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

      const { response, id: passkeyId } = retrievedCredential

      if (!(response instanceof AuthenticatorAssertionResponse)) {
        throw new TypeError()
      }

      const { userHandle } = response

      if (userHandle === null) {
        throw new TypeError()
      }

      this.passkeyId = passkeyId
      this.userHandle = userHandle

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
        id: passkeyId,
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
      let { passkeyId, userHandle } = this

      if (passkeyId === null || userHandle === null) {
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

        const { userHandle: responseUserHandle } = response

        if (responseUserHandle === null) {
          throw new TypeError()
        }

        this.passkeyId = id
        this.userHandle = responseUserHandle

        passkeyId = id
        userHandle = responseUserHandle
      }

      const userHandleBase64 = dataTransform.bufferToBase64(userHandle)

      const getUserHeaders: paths['/api/v1/user']['get']['parameters']['header'] =
        {
          'x-user-id': passkeyId,
        }

      const getUserResponse = await fetch(`${this.apiRoot}/v1/user`, {
        method: 'GET',
        headers: getUserHeaders,
      })

      const { status: getUserResponseStatus } = getUserResponse

      if (getUserResponseStatus !== 200) {
        throw new Error(
          `Received error from ${this.apiRoot}/v1/user: ${getUserResponseStatus}`
        )
      }

      const getUserResponseBodyJson = await getUserResponse.json()

      if (!isGetUserResponse(getUserResponseBodyJson)) {
        throw new TypeError(
          `Unexpected response from ${this.apiRoot}/v1/user: ${JSON.stringify(getUserResponseBodyJson)}`
        )
      }

      const { user: { keys = '', salt = '', iv = '' } = {} } =
        getUserResponseBodyJson

      const serializedKeys = await crypto.decryptSerializedKeys(
        keys,
        userHandleBase64,
        iv,
        salt
      )

      const signature = await crypto.getSignature(signatureMessage, {
        privateKey: serializedKeys.signatureKeys.privateKey,
      })

      const getSessionHeaders: paths['/api/v1/session']['get']['parameters']['header'] =
        {
          'x-passway-id': passkeyId,
          'x-passway-signature': Buffer.from(signature).toString('base64'),
        }

      const getSessionResponse = await fetch(`${this.apiRoot}/v1/session`, {
        method: 'GET',
        headers: getSessionHeaders,
      })

      const { status: getSessionResponseStatus } = getSessionResponse

      if (getSessionResponseStatus !== 200) {
        throw new Error(
          `Received error from ${this.apiRoot}/v1/session: ${getSessionResponseStatus}`
        )
      }

      return true
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }
}
