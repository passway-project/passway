/* c8 ignore start */
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import standardConfig from './vite.config'

/**
 * @type {import('vite').UserConfig}
 */
const userConfig = {
  ...standardConfig,
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        Blob: true,
      },
    }),
  ],
  test: {
    ...standardConfig.test,
    include: ['**/?(*.)+(integration-test).[tj]s'],
    silent: false,
  },
}

export default userConfig
