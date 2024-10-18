/* c8 ignore start */
import { UserConfig } from 'vite'
//import { nodePolyfills } from 'vite-plugin-node-polyfills'

import standardConfig, { testPlugins } from './vite.config'

const userConfig: UserConfig = {
  ...standardConfig,
  plugins: testPlugins,
  //optimizeDeps: {
  //include: [
  //'vite-plugin-node-polyfills/shims/buffer',
  //'vite-plugin-node-polyfills/shims/global',
  //'vite-plugin-node-polyfills/shims/process',
  //],
  //},
  //plugins: [
  //nodePolyfills({
  //globals: {
  //Buffer: true,
  //},
  //}),
  //],
  test: {
    ...standardConfig.test,
    include: ['**/?(*.)+(integration-test).[tj]s'],
    silent: false,
    alias: {
      'tus-js-client': 'tus-js-client/lib.es5/browser/index.js',
    },
    //setupFiles: ['src/integration-test-setup.ts'],
    //browser: {
    //screenshotFailures: false,
    //provider: 'playwright',
    //enabled: true,
    //name: 'firefox',
    //headless: true,
    //},
  },
}

export default userConfig
