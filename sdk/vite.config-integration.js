/* c8 ignore start */

import standardConfig from './vite.config'

/**
 * @type {import('vite').UserConfig}
 */
const userConfig = {
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
