import { resolve } from 'path'

import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  root: __dirname,
  build: {
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      name: 'PasswayClient',
      fileName: 'passway-client',
    },
  },
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
})
