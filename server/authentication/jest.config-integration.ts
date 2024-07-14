/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest'
import standardConfig from './jest.config'

const config: Config = {
  ...standardConfig,

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(integration-test).[tj]s?(x)',
  ],
}

export default config
