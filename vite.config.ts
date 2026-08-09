/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar Supabase em seu próprio chunk
          if (id.includes('node_modules/@supabase')) {
            return 'supabase'
          }
          // Separar vendor (React + dependencies)
          if (id.includes('node_modules/')) {
            return 'vendor'
          }
          // Telas podem ficar juntas ou em chunk separado (por agora juntas)
          // Lib de negócio fica no bundle principal
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
})
