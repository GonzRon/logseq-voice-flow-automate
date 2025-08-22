// vite.config.ts - Build configuration for VoiceFlow Automate
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import logseqDevPlugin from 'vite-plugin-logseq'

export default defineConfig({
  plugins: [
    react(),
    logseqDevPlugin()
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js'
      }
    }
  },
  optimizeDeps: {
    include: ['openai', 'exponential-backoff', 'toml']
  }
})