import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [dts({ include: ['src'] })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        testing: resolve(__dirname, 'src/testing.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
    },
  },
  test: {
    globals: true,
  },
})
