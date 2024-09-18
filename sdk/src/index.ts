import { Upload } from 'tus-js-client'

export * from './types'
import {
  GetSessionHeaders,
  GetUserHeaders,
  PasskeyConfig,
  PutUserBody,
  isGetUserResponse,
} from './types'
import {
  AuthenticationError,
  LoginError,
  LogoutError,
  PasskeyCreationError,
  RegistrationError,
} from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'
import { uploadChunkSizeMB, signatureMessage } from './constants'

interface PasswayClientConfig {
  apiRoot: string
}

export interface UploadOptions {
  /**
   * Default value: true
   */
  enableEncryption?: boolean
}

export class PasswayClient {
  readonly apiRoot: string

  private passkeyId: string | null = null
  private userHandle: ArrayBuffer | null = null

  private getEncryptedDataStreamReader = async (data: Upload['file']) => {
    const readableStream =
      data instanceof Blob ? data.stream().getReader() : data

    const { userHandle } = this

    if (userHandle === null) {
      throw new AuthenticationError()
    }

    const encryptedStream = await crypto
      .getKeychain(dataTransform.bufferToBase64(userHandle))
      .encryptStream(dataTransform.convertReaderToStream(readableStream))

    return encryptedStream.getReader()
  }

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

      const getUserHeaders: GetUserHeaders = {
        'x-passway-id': passkeyId,
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

      const getSessionHeaders: GetSessionHeaders = {
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
    const deleteSessionResponse = await window.fetch(
      `${this.apiRoot}/v1/session`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )

    const { status } = deleteSessionResponse

    if (status !== 200) {
      throw new LogoutError()
    }

    return true
  }

  // FIXME: Test this
  upload = async (
    data: Upload['file'],
    { enableEncryption = true }: UploadOptions = {}
  ) => {
    const dataStream = enableEncryption
      ? await this.getEncryptedDataStreamReader(data)
      : data

    const uploadPromise = new Promise<void>((resolve, reject) => {
      const upload = new Upload(dataStream, {
        chunkSize: uploadChunkSizeMB * 1024 * 1024,
        uploadLengthDeferred: true,
        // FIXME: Make constants for routes
        endpoint: `${this.apiRoot}/v1/content/`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {},

        onError: error => {
          console.error('Upload failed: ' + error)
          reject(error)
        },

        onSuccess: () => {
          resolve()
        },

        onShouldRetry: function (err) {
          const status = err.originalResponse
            ? err.originalResponse.getStatus()
            : 0

          if (status === 403 || status === 500) {
            return false
          }

          return true
        },

        onBeforeRequest: request => {
          const xhr: XMLHttpRequest = request.getUnderlyingObject()
          xhr.withCredentials = true
        },
      })

      upload.start()
    })

    return uploadPromise
  }

  // FIXME: Test this
  listContent = async () => {
    const getContentListResponse = await window.fetch(
      `${this.apiRoot}/v1/content/list`,
      {
        method: 'GET',
        credentials: 'include',
      }
    )

    const { status: getContentListResponseStatus } = getContentListResponse

    if (getContentListResponseStatus !== 200) {
      throw new Error(
        `Received error from ${this.apiRoot}/v1/content/list: ${getContentListResponseStatus}`
      )
    }

    // FIXME: Validate the type of getContentListResponseBody
    const getContentListResponseBody = await getContentListResponse.json()

    return getContentListResponseBody
  }
}
