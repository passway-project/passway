import { resolve } from 'node:path'
import fs from 'node:fs'

import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/** @type {Buffer | undefined} */
let cert
/** @type {Buffer | undefined} */
let key

try {
  cert = fs.readFileSync('localhost.crt')
  key = fs.readFileSync('localhost.key')
} catch (e) {
  console.warn('SSL certificates not found')
}

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
    // NOTE: nodePolyfills plugin must ONLY be enabled in non-test environments
    nodePolyfills({
      globals: {
        Buffer: true,
        Blob: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    silent: true,
    mockReset: true,
    restoreMocks: true,
    setupFiles: ['src/test-setup.ts'],
  },
  server: {
    https: {
      cert,
      key,
    },
  },
})
