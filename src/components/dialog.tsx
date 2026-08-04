import { useEffect, useRef, useState } from 'react'

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

const btnBase: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontFamily: 'var(--sans)' }

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
  const danger = req.kind === 'confirm' && o.danger
  return (
    <div onClick={cancel} onKeyDown={(e) => e.key === 'Escape' && cancel()}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 380, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0', fontWeight: 700, fontSize: 14.5 }}>
          {o.title ?? (req.kind === 'confirm' ? 'ยืนยันการทำรายการ' : 'แจ้งเตือน')}
        </div>
        <div style={{ padding: '10px 20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {o.body && <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{o.body}</div>}
          {req.kind === 'prompt' && (
            <div>
              {o.label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>{o.label}</label>}
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
            ...btnBase, fontWeight: 700, border: 'none',
            background: danger ? 'var(--danger)' : 'var(--accent)', color: danger ? 'var(--bg)' : 'var(--bg)',
          }}>
            {o.confirmText ?? (req.kind === 'confirm' ? 'ยืนยัน' : 'ตกลง')}
          </button>
        </div>
      </div>
    </div>
  )
}
