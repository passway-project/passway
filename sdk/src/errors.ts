export class PasskeyCreationError extends Error {
  message = 'Passkey creation failed'
}

export class RegistrationError extends Error {
  message = 'Registration failed'
}

export class LoginError extends Error {
  message = 'Login failed'
}

export class LogoutError extends Error {
  message = 'Logout failed'
}

export class AuthenticationError extends Error {
  message = 'The user is not authenticated'
}

export class ResponseBodyError extends Error {
  message = 'The expected response was not received'
}

export class ArgumentError extends Error {}

export class DecryptionError extends Error {
  message = 'Data decryption failed'
}
