import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so a built bundle runs from a file path or any subdirectory —
  // the offline round is judged on a laptop, not a domain.
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
})
