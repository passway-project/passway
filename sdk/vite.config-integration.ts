/* c8 ignore start */
import { UserConfig } from 'vite'

import standardConfig from './vite.config'

const userConfig: UserConfig = {
  ...standardConfig,
  // NOTE: nodePolyfills plugin needs to be disabled for test environment
  plugins: [],
  test: {
    ...standardConfig.test,
    include: ['**/?(*.)+(integration-test).[tj]s'],
    silent: false,
  },
}

export default userConfig
