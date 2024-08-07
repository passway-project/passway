export * from './types'
import { paths } from './schema'
import { PasskeyConfig, PutUserBody, isGetUserResponse } from './types'
import { LoginError, PasskeyCreationError, RegistrationError } from './errors'
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
      throw new PasskeyCreationError()
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

      if (!(retrievedCredential instanceof window.PublicKeyCredential)) {
        throw new TypeError()
      }

      const { response, id: passkeyId } = retrievedCredential

      if (!(response instanceof window.AuthenticatorAssertionResponse)) {
        throw new TypeError()
      }

      const { userHandle } = response

      if (userHandle === null) {
        throw new TypeError()
      }

      this.passkeyId = passkeyId
      this.userHandle = userHandle

      const userHandleBase64 = dataTransform.bufferToBase64(userHandle)

      const iv = await dataGenerator.getIv()
      const ivBase64 = dataTransform.bufferToBase64(iv)

      const salt = await dataGenerator.getSalt()
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

      const { status } = await window.fetch(`${this.apiRoot}/v1/user`, {
        method: 'PUT',
        body: JSON.stringify(putUserBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (status !== 201) {
        throw new Error()
      }
    } catch (e) {
      console.error(e)
      throw new RegistrationError()
    }

    return true
  }

  // TODO: Add method for updating a user

  // TODO: Explore methods to optionally store credentials in local storage so
  // that the user does not have to be prompted for credentials in each
  // session.
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

        if (!(retrievedCredential instanceof window.PublicKeyCredential)) {
          throw new TypeError()
        }

        const { response, id } = retrievedCredential

        if (!(response instanceof window.AuthenticatorAssertionResponse)) {
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

      const getUserResponse = await window.fetch(`${this.apiRoot}/v1/user`, {
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

      const getSessionResponse = await window.fetch(
        `${this.apiRoot}/v1/session`,
        {
          method: 'GET',
          headers: getSessionHeaders,
          credentials: 'include',
        }
      )

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

  destroySession = async () => {
    await window.fetch(`${this.apiRoot}/v1/session`, {
      method: 'DELETE',
      credentials: 'include',
    })
  }
}
