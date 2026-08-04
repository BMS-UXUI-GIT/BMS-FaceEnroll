import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'   // เลข version มาจากที่เดียว — โชว์บนหน้า login

// Frontend calls the dashboard backend (attendance-api :8300) directly via CORS.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5273 },
})
