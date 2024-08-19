/* c8 ignore start */
import { defineConfig as vitestDefineConfig } from 'vitest/config'

const vitestConfig = vitestDefineConfig({
  test: {
    globals: true,
    environment: 'node',
    restoreMocks: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist'],
    },
  },
})

export default vitestConfig
