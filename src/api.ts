import type { Session } from './state'
import { MOCK, mockSession } from './mock'

// Dashboard backend lives inside attendance-api (/admin). Call it directly (CORS enabled).
// Dev default :8300; prod set VITE_API_BASE. Endpoints already include the /admin prefix.
// ลำดับ: runtime config (config.js บน server) > build-time (VITE_API_BASE) > dev localhost
const BASE = window.__API_BASE__ || (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8300'

let token: string | null = null
let onAuthError: (() => void) | null = null

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  // โหมด mock (dev + VITE_MOCK=1) — ตอบจากข้อมูลตัวอย่าง ไม่แตะ network เลย
  if (MOCK) {
    const { mockRoute } = await import('./mockData')
    const body = typeof opts.body === 'string' ? JSON.parse(opts.body) : undefined
    const out = mockRoute(opts.method ?? 'GET', path, body)
    if (out === undefined) throw new Error(`[mock] ยังไม่มีข้อมูลตัวอย่างของ ${path}`)
    await new Promise((r) => setTimeout(r, 120)) // หน่วงนิดให้เห็นสถานะกำลังโหลดจริง
    return out as T
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  const text = await res.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = null } // error page อาจเป็น HTML
  if (!res.ok) {
    // 401 = token หมดอายุ/ไม่ถูกต้อง -> เคลียร์ session เด้งกลับ login (ยกเว้นตอน login เอง)
    if (res.status === 401 && !path.includes('/auth/login')) onAuthError?.()
    const msg = (body && (body.detail || body.message)) || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return body as T
}

export const api = {
  setToken(t: string | null) {
    token = t
  },
  setAuthErrorHandler(fn: (() => void) | null) {
    onAuthError = fn
  },
  async login(username: string, password: string): Promise<Session> {
    if (MOCK) return mockSession(username) // dev only — ดู src/mock.ts
    return req<Session>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  // พนักงานโรง login ด้วยบัญชี HOSxP -> session อ่านอย่างเดียว (role user) โรงตัวเอง
  async staffLogin(hcode: string, username: string, password: string): Promise<Session> {
    if (MOCK) return mockSession(username || 'user', { kind: 'staff', hcode })
    return req<Session>('/admin/auth/staff-login', {
      method: 'POST',
      body: JSON.stringify({ hcode, username, password }),
    })
  },
  // ยืนยันรหัสผ่านของบัญชีที่ login อยู่ (ไม่ออก token ใหม่) — ใช้ก่อนเข้าเมนูงานส่วนกลาง
  async verifyPassword(password: string): Promise<{ ok: boolean }> {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 250))
      if (password.trim().length < 4) throw new Error('รหัสผ่านไม่ถูกต้อง')
      return { ok: true }
    }
    return req<{ ok: boolean }>('/admin/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },
  // เข้าดูโรงพยาบาลสาธิตแบบสาธารณะ (ไม่ต้อง login) — session อ่านอย่างเดียว
  async demoLogin(): Promise<Session> {
    if (MOCK) return mockSession('user')
    return req<Session>('/admin/auth/demo', { method: 'POST' })
  },
  async logout(): Promise<void> {
    if (MOCK) return
    await req('/admin/auth/logout', { method: 'POST' })
  },
  // generic GET/POST for screens (typed at call site)
  get<T>(path: string): Promise<T> {
    return req<T>(path)
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return req<T>(path, { method: 'POST', body: JSON.stringify(body) })
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return req<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
  },
  del<T>(path: string): Promise<T> {
    return req<T>(path, { method: 'DELETE' })
  },
  // fetch a file (CSV etc.) with auth and trigger a browser download
  async download(path: string, filename: string): Promise<void> {
    if (MOCK) {
      const { mockCsv } = await import('./mockData')
      // ﻿ = BOM ให้ Excel อ่านภาษาไทยไม่เพี้ยน (ตรงกับที่ backend ส่งมาจริง)
      saveBlob(new Blob(['﻿' + mockCsv(path)], { type: 'text/csv;charset=utf-8' }), filename)
      return
    }
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE}${path}`, { headers })
    if (!res.ok) {
      if (res.status === 401) onAuthError?.()
      throw new Error(`ดาวน์โหลดไม่สำเร็จ (HTTP ${res.status})`)
    }
    saveBlob(await res.blob(), filename)
  },
}

// สั่งเบราว์เซอร์เซฟไฟล์ (ใช้ทั้งของจริงและ mock)
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
