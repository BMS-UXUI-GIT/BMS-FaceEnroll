import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'   // เลข version มาจากที่เดียว — โชว์บนหน้า login

// Frontend calls the dashboard backend (attendance-api :8300) directly via CORS.
//
// BASE_PATH — ปกติเป็น '/' (dev + build ขึ้น server จริงที่วางไว้ที่ root)
// เว็บ demo บน GitHub Pages อยู่ใต้ /<ชื่อ repo>/ จึงต้องตั้งค่านี้ตอน build
// ที่นั่นที่เดียว (ดู .github/workflows/deploy-pages.yml) ไม่กระทบการใช้งานปกติ
// ประกาศเองแทนการลง @types/node (ไฟล์นี้รันบน node ตอน build เท่านั้น)
declare const process: { env: Record<string, string | undefined> }
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5273 },
})
