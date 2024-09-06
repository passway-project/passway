import { resolve } from 'node:path'
import fs from 'node:fs'

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
      cert: fs.readFileSync('localhost.crt'),
      key: fs.readFileSync('localhost.key'),
    },
  },
})
