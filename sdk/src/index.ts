import { PassThrough } from 'node:stream'

import { Upload as TusUpload } from 'tus-js-client'
import window from 'global/window'

import {
  GetSessionHeaders,
  GetUserHeaders,
  PasskeyConfig,
  PutUserBody,
  isGetContentListResponse,
  isGetUserResponse,
} from './types'
import {
  ArgumentError,
  AuthenticationError,
  DecryptionError,
  LoginError,
  LogoutError,
  PasskeyCreationError,
  RegistrationError,
  ResponseBodyError,
} from './errors'
import { dataGenerator } from './services/DataGenerator'
import { dataTransform } from './services/DataTransform'
import { crypto } from './services/Crypto'
import { signatureMessage } from './constants'
import { Route, RouteService } from './services/Route'
import { ContentService } from './services/Content'

export * from './types'

export interface PasswayClientConfig {
  apiRoot: string
  apiVersion?: number
}

export interface UploadOptions {
  /**
   * Default value: true
   */
  enableEncryption?: boolean

  Upload?: typeof TusUpload
}

export class PasswayClient {
  readonly apiRoot: string
  private route: RouteService

  private passkeyId: string | null = null
  private userHandle: ArrayBuffer | null = null

  private getEncryptedDataStreamReader = async (data: TusUpload['file']) => {
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

  constructor({ apiRoot, apiVersion = 1 }: PasswayClientConfig) {
    this.apiRoot = apiRoot
    this.route = new RouteService(apiRoot, apiVersion)
  }

  createPasskey = async (registrationConfig: PasskeyConfig) => {
    try {
      await window.navigator.credentials.create({
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
      const retrievedCredential = await window.navigator.credentials.get({
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

      const userRoute = this.route.resolve(Route.user)

      const { status } = await window.fetch(userRoute, {
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
        const retrievedCredential = await window.navigator.credentials.get({
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

      const userRoute = this.route.resolve(Route.user)

      const getUserResponse = await window.fetch(userRoute, {
        method: 'GET',
        headers: getUserHeaders,
      })

      const { status: getUserResponseStatus } = getUserResponse

      if (getUserResponseStatus !== 200) {
        throw new Error(
          `Received error from ${userRoute}: ${getUserResponseStatus}`
        )
      }

      const getUserResponseBodyJson = await getUserResponse.json()

      if (!isGetUserResponse(getUserResponseBodyJson)) {
        throw new TypeError(
          `Unexpected response from ${userRoute}: ${JSON.stringify(getUserResponseBodyJson)}`
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

      const sessionRoute = this.route.resolve(Route.session)

      const getSessionResponse = await window.fetch(sessionRoute, {
        method: 'GET',
        headers: getSessionHeaders,
        credentials: 'include',
      })

      const { status: getSessionResponseStatus } = getSessionResponse

      if (getSessionResponseStatus !== 200) {
        throw new Error(
          `Received error from ${sessionRoute}: ${getSessionResponseStatus}`
        )
      }

      return true
    } catch (e) {
      console.error(e)
      throw new LoginError()
    }
  }

  destroySession = async () => {
    const sessionRoute = this.route.resolve(Route.session)

    const deleteSessionResponse = await window.fetch(sessionRoute, {
      method: 'DELETE',
      credentials: 'include',
    })

    const { status } = deleteSessionResponse

    if (status !== 200) {
      throw new LogoutError()
    }

    return true
  }

  upload = async (
    data: TusUpload['file'],
    { enableEncryption = true, Upload = TusUpload }: UploadOptions = {}
  ) => {
    const dataStream = enableEncryption
      ? await this.getEncryptedDataStreamReader(data)
      : data

    const contentRoute = this.route.resolve(Route.content)
    const content = new ContentService({ UploadImpl: Upload, contentRoute })

    // TODO: Return metadata about the uploaded data
    return content.upload(dataStream, {
      isEncrypted: enableEncryption ? '1' : '0',
    })
  }

  listContent = async () => {
    const contentListRoute = this.route.resolve(Route.contentList)

    const getContentListResponse = await window.fetch(contentListRoute, {
      method: 'GET',
      credentials: 'include',
    })

    const { status: getContentListResponseStatus } = getContentListResponse

    if (getContentListResponseStatus !== 200) {
      throw new Error(
        `Received error from ${contentListRoute}: ${getContentListResponseStatus}`
      )
    }

    const getContentListResponseBody = await getContentListResponse.json()

    if (!isGetContentListResponse(getContentListResponseBody)) {
      throw new ResponseBodyError()
    }

    return getContentListResponseBody
  }

  // TODO: Infer isEncrypted from content metadata
  download = async (contentId: string, { isEncrypted = true } = {}) => {
    if (contentId.length === 0) {
      throw new ArgumentError('contentId is empty')
    }

    const { userHandle } = this

    if (userHandle === null) {
      throw new AuthenticationError()
    }

    const route = this.route.resolve(Route.contentDownload, { contentId })

    const getContentDownloadResponse = await window.fetch(route, {
      method: 'GET',
      credentials: 'include',
    })

    const { status: getContentDownloadResponseStatus } =
      getContentDownloadResponse

    if (getContentDownloadResponseStatus !== 200) {
      throw new Error(
        `Received error from ${route}: ${getContentDownloadResponseStatus}`
      )
    }

    const { body } = getContentDownloadResponse

    if (body === null) {
      throw new ResponseBodyError()
    }

    try {
      const bodyStream =
        body instanceof PassThrough
          ? // NOTE: This is only needed for the integration test environment
            // due to the nonstandard implementation details of the node-fetch
            // polyfill.
            /* c8 ignore next */
            dataTransform.passThroughToReadableStream(body)
          : body

      const decryptedStream = isEncrypted
        ? await crypto
            .getKeychain(dataTransform.bufferToBase64(userHandle))
            .decryptStream(bodyStream)
        : bodyStream

      return decryptedStream
    } catch (e) {
      console.error(e)
      throw new DecryptionError()
    }
  }
}
