import { randomUUID } from 'node:crypto'

import window from 'global/window'

import { dataGenerator } from '../../src/services/DataGenerator'

export const mockUserHandle = dataGenerator.getRandomUint8Array(64)
export const mockPasskeyId = 'b1KMe302QMK9sduTOjKK9w'
export const generateMockPasskeyId = () => randomUUID()
export const mockRawId = dataGenerator.getRandomUint8Array(16)
export const generateMockRawId = () => dataGenerator.getRandomUint8Array(16)
export const mockFileStringContent = 'mock content'

export const mockAuthenticatorAttestationResponse =
  new window.AuthenticatorAttestationResponse()

const mockAuthenticatorAssertionResponse: AuthenticatorAssertionResponse =
  Object.assign(new window.AuthenticatorAssertionResponse(), {
    clientDataJSON: dataGenerator.getRandomUint8Array(181),
    signature: dataGenerator.getRandomUint8Array(70),
    userHandle: mockUserHandle,
  })

export const generateMockCreatePublicKeyCredential = (
  { id, rawId }: Pick<PublicKeyCredential, 'id' | 'rawId'> = {
    id: generateMockPasskeyId(),
    rawId: generateMockRawId(),
  }
): PublicKeyCredential =>
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

// FIXME: Make a factory for this
export const mockGetPublicKeyCredential: PublicKeyCredential = Object.assign(
  new window.PublicKeyCredential(),
  {
    id: mockPasskeyId,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => {
      throw new Error()
    },
    rawId: mockRawId,
    response: mockAuthenticatorAssertionResponse,
  }
)
