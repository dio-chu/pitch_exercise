import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/pitch_exercise/',
  plugins: [react()],
})
