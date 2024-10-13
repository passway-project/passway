/* c8 ignore start */

import standardConfig from './vite.config'

/**
 * @type {import('vite').UserConfig}
 */
const userConfig = {
  ...standardConfig,
  // NOTE: nodePolyfills plugin needs to be disabled for test environment
  plugins: [],
}

export default userConfig
