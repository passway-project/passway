import { randomUUID } from 'node:crypto'

import window from 'global/window'

import { dataGenerator } from '../../src/services/DataGenerator'

export const generateMockUserHandle = () =>
  dataGenerator.getRandomUint8Array(64)
export const generateMockPasskeyId = () => randomUUID()
export const generateMockRawId = () => dataGenerator.getRandomUint8Array(16)
export const mockFileStringContent = 'mock content'

export const generateMockAuthenticatorAssertionResponse = ({
  userHandle,
}: Pick<
  AuthenticatorAssertionResponse,
  'userHandle'
>): AuthenticatorAssertionResponse =>
  Object.assign(new window.AuthenticatorAssertionResponse(), {
    clientDataJSON: dataGenerator.getRandomUint8Array(181),
    signature: dataGenerator.getRandomUint8Array(70),
    userHandle,
  })

export const generateMockCreatePublicKeyCredential = ({
  id,
  rawId,
}: Pick<PublicKeyCredential, 'id' | 'rawId'>): PublicKeyCredential =>
  Object.assign(new window.PublicKeyCredential(), {
    id,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => {
      throw new Error()
    },
    rawId,
    response: new window.AuthenticatorAttestationResponse(),
  })

export const generateMockGetPublicKeyCredential = ({
  id,
  rawId,
  response,
}: Pick<
  PublicKeyCredential,
  'id' | 'rawId' | 'response'
>): PublicKeyCredential =>
  Object.assign(new window.PublicKeyCredential(), {
    id,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => {
      throw new Error()
    },
    rawId,
    response,
  })
