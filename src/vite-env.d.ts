/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_MOCK?: string // '1' = mock ตอน dev (ดู src/mock.ts) — ตั้งใน .env.local
  readonly VITE_DEMO?: string // '1' = build เว็บ demo ที่ฝัง mock (ใช้เฉพาะ GitHub Pages)
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
interface Window {
  __API_BASE__?: string // runtime config (config.js) — ตั้ง URL backend ตอน deploy
}

// เลข version จาก package.json — vite ฝังตอน build
declare const __APP_VERSION__: string
