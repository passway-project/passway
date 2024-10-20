/* c8 ignore start */
import { UserConfig } from 'vite'

import standardConfig, { testPlugins } from './vite.config'

const userConfig: UserConfig = {
  ...standardConfig,
  plugins: testPlugins,
  test: {
    ...standardConfig.test,
    include: ['**/?(*.)+(integration-test).[tj]s'],
    silent: false,
    alias: {
      'tus-js-client': 'tus-js-client/lib.es5/browser/index.js',
    },
  },
}

export default userConfig
