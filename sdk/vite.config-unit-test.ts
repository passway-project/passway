/* c8 ignore start */
import { UserConfig } from 'vite'

import standardConfig, { testPlugins } from './vite.config'

const userConfig: UserConfig = {
  ...standardConfig,
  plugins: testPlugins,
}

export default userConfig
