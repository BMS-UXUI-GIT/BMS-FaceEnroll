import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// สไลด์นำเสนอ — sub-app แยกจากตัวระบบ ใช้ dependency ชุดเดียวกับโปรเจกต์หลัก
// dev:   npm run pres        (vite เสิร์ฟโฟลเดอร์นี้)
// build: npm run pres:build  (ออกที่ presentation/dist เปิดไฟล์ตรงได้)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
