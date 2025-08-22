import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import logseqDevPlugin from 'vite-plugin-logseq'

export default defineConfig({
  plugins: [react(), logseqDevPlugin()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
})