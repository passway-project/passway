import { User } from '@prisma/client'

import { MockKeyData } from './utils/getMockKeyData'

export const stubUserId = 0
export const stubPasskeyId = 'foo'
export const stubUserPasskeySecret = 'abc123'
export const stubIv = crypto.getRandomValues(new Uint8Array(12))
export const stubSalt = crypto.getRandomValues(new Uint8Array(16))
export const stubUserIvString = Buffer.from(stubIv).toString('base64')
export const stubUserSaltString = Buffer.from(stubSalt).toString('base64')

export const stubKeyData = (): MockKeyData => ({
  publicKey: '',
  privateKey: '',
  encryptedKeys: '',
})

export const getStubUser = (): User => ({
  id: stubUserId,
  passkeyId: stubPasskeyId,
  encryptedKeys: '',
  iv: stubUserIvString,
  salt: stubUserSaltString,
  publicKey: '',
  createdAt: stubTimestamp,
  updatedAt: stubTimestamp,
})

export const hydrateMockUser = (mockUser: User, mockKeyData: MockKeyData) => {
  Object.assign(mockUser, {
    encryptedKeys: mockKeyData.encryptedKeys,
    publicKey: mockKeyData.publicKey,
  })
}

export const stubTimestamp = new Date(Date.now())
