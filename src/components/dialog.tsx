import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'

// dialog กลางของระบบ — แทน window.confirm/prompt/alert ที่หน้าตาเป็นของ browser
// ใช้แบบ imperative: await dialog.confirm({...}) ; ต้อง mount <DialogHost/> ใน App หนึ่งครั้ง

type ConfirmOpts = { title?: string; body?: string; confirmText?: string; cancelText?: string; danger?: boolean }
type PromptOpts = {
  title: string
  label?: string
  initial?: string
  placeholder?: string
  confirmText?: string
  mono?: boolean                            // ช่องกรอกเป็น mono (รหัสผ่าน/ตัวเลข)
  danger?: boolean                          // ปุ่มยืนยันเป็นสีอันตราย (เช่นยืนยันชื่อก่อนลบ)
  validate?: (v: string) => string | null   // คืนข้อความ error ; null = ผ่าน
}
type AlertOpts = { title?: string; body: string }

type Req =
  | { kind: 'confirm'; o: ConfirmOpts; res: (v: boolean) => void }
  | { kind: 'prompt'; o: PromptOpts; res: (v: string | null) => void }
  | { kind: 'alert'; o: AlertOpts; res: () => void }

let push: ((r: Req) => void) | null = null

export const dialog = {
  /** ยืนยันก่อนทำ — คืน true เมื่อกดยืนยัน */
  confirm: (o: ConfirmOpts) => new Promise<boolean>((res) =>
    push ? push({ kind: 'confirm', o, res }) : res(window.confirm(o.body || o.title || ''))),
  /** ถามข้อความ — คืน null เมื่อยกเลิก */
  prompt: (o: PromptOpts) => new Promise<string | null>((res) =>
    push ? push({ kind: 'prompt', o, res }) : res(window.prompt(o.title, o.initial ?? ''))),
  alert: (o: AlertOpts) => new Promise<void>((res) =>
    push ? push({ kind: 'alert', o, res }) : (window.alert(o.body), res())),
}

const btnBase: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontFamily: 'var(--sans)' }

// ── Toast ─────────────────────────────────────────────────────────────
// แจ้งผลสั้นๆ มุมล่างขวา หายเอง — ใช้ตอน CRUD สำเร็จ/ล้มเหลว
// dialog.toast มาจากไฟล์นี้เพื่อไม่ต้อง mount host เพิ่มหลายตัว (มี <ToastHost/> ตัวเดียวใน App)
type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; msg: string; type: ToastType }
let pushToast: ((t: ToastItem) => void) | null = null
let toastSeq = 0

export const toast = {
  success: (msg: string) => pushToast?.({ id: ++toastSeq, msg, type: 'success' }),
  error: (msg: string) => pushToast?.({ id: ++toastSeq, msg, type: 'error' }),
  info: (msg: string) => pushToast?.({ id: ++toastSeq, msg, type: 'info' }),
}

const TOAST_TONE: Record<ToastType, { bar: string; icon: string }> = {
  success: { bar: 'var(--ok)', icon: 'scan' },
  error: { bar: 'var(--danger)', icon: 'alert' },
  info: { bar: 'var(--accent-active)', icon: 'info' },
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    pushToast = (t) => {
      setItems((cur) => [...cur, t])
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 3200)
    }
    return () => { pushToast = null }
  }, [])

  if (items.length === 0) return null
  return (
    <div style={{ position: 'fixed', right: 'var(--sp-5)', bottom: 'var(--sp-5)', zIndex: 500, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', maxWidth: 380 }}>
      {items.map((t) => {
        const tone = TOAST_TONE[t.type]
        return (
          <div key={t.id} role="status" style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
            padding: '12px 16px', borderRadius: 'var(--r-md)',
            background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            borderLeft: `4px solid ${tone.bar}`, animation: 'toastUp .18s ease',
          }}>
            <span aria-hidden style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', background: tone.bar, color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={tone.icon} size={14} width={2} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DialogHost() {
  const [req, setReq] = useState<Req | null>(null)
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    push = (r) => {
      setReq(r)
      setValue(r.kind === 'prompt' ? r.o.initial ?? '' : '')
      setErr(null)
    }
    return () => { push = null }
  }, [])
  useEffect(() => {
    if (req?.kind === 'prompt') setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 30)
  }, [req])

  if (!req) return null

  const close = () => setReq(null)
  const cancel = () => {
    if (req.kind === 'confirm') req.res(false)
    else if (req.kind === 'prompt') req.res(null)
    else req.res()
    close()
  }
  const ok = () => {
    if (req.kind === 'prompt') {
      const e = req.o.validate?.(value) ?? null
      if (e) { setErr(e); return }
      req.res(value)
    } else if (req.kind === 'confirm') req.res(true)
    else req.res()
    close()
  }

  const o: any = req.o
  const danger = (req.kind === 'confirm' || req.kind === 'prompt') && o.danger
  return (
    <div onClick={cancel} onKeyDown={(e) => e.key === 'Escape' && cancel()}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 380, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0', fontWeight: 500, fontSize: 14.5 }}>
          {o.title ?? (req.kind === 'confirm' ? 'ยืนยันการทำรายการ' : 'แจ้งเตือน')}
        </div>
        <div style={{ padding: '10px 20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {o.body && <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{o.body}</div>}
          {req.kind === 'prompt' && (
            <div>
              {o.label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>{o.label}</label>}
              <input ref={inputRef} value={value} placeholder={o.placeholder}
                onChange={(e) => { setValue(e.target.value); setErr(null) }}
                onKeyDown={(e) => e.key === 'Enter' && ok()}
                style={{
                  width: '100%', padding: '10px 12px', border: `1px solid ${err ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 9,
                  background: 'var(--surface-card)', color: 'var(--text)', fontSize: 13.5, outline: 'none',
                  fontFamily: o.mono ? 'var(--mono)' : 'var(--sans)', letterSpacing: o.mono ? '1px' : undefined,
                }} />
              {err && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>{err}</div>}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {req.kind !== 'alert' && (
            <button onClick={cancel} style={{ ...btnBase, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)' }}>
              {o.cancelText ?? 'ยกเลิก'}
            </button>
          )}
          <button onClick={ok} autoFocus={req.kind !== 'prompt'} style={{
            ...btnBase, fontWeight: 500, border: 'none',
            background: danger ? 'var(--danger)' : 'var(--accent)', color: danger ? 'var(--bg)' : 'var(--bg)',
          }}>
            {o.confirmText ?? (req.kind === 'confirm' ? 'ยืนยัน' : 'ตกลง')}
          </button>
        </div>
      </div>
    </div>
  )
}
