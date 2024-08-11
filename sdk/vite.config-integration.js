import standardConfig from './vite.config'

/**
 * @type {import('vite').UserConfig}
 */
const userConfig = {
  ...standardConfig,
  test: {
    ...standardConfig.test,
    include: ['**/?(*.)+(integration-test).[tj]s'],
    silent: false,
  },
}

export default userConfig
