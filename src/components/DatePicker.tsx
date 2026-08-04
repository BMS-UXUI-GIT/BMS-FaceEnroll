import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ปฏิทินเลือกวันที่/เดือน แบบ custom เข้าธีม (แทน <input type=date> ของ system)
// โชว์ พ.ศ. + เดือนไทย · panel เป็น portal แบบเดียวกับ SearchSelect

const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TH_M_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const TH_WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const parseISO = (s?: string | null): [number, number, number] | null => {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null
}

/** "2026-07-10" -> "10 ก.ค. 69" */
export const thShort = (s?: string | null) => {
  const p = parseISO(s)
  return p ? `${p[2]} ${TH_M[p[1]]} ${(p[0] + 543) % 100}` : '—'
}

const calIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', opacity: 0.65 }}>
    <rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
  </svg>
)

// เปิด/ปิด panel + ตำแหน่ง (fixed portal) — pattern เดียวกับ SearchSelect
function usePanel() {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, up: false })

  const openPanel = () => {
    const r = btnRef.current!.getBoundingClientRect()
    const up = window.innerHeight - r.bottom < 360 && r.top > 360
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 292)), up })
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onAway = (e: Event) => { if (!panelRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onAway, true)
    window.addEventListener('resize', onAway)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', onAway, true); window.removeEventListener('resize', onAway) }
  }, [open])
  return { open, setOpen, btnRef, panelRef, pos, openPanel }
}

// trigger แบบข้อความล้วน — Figma ชิป "ช่วงวันที่" โชว์ค่าเป็น 14/500 ไม่มีกรอบ
const bareTriggerSt: React.CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
  fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, lineHeight: '20px',
  color: 'var(--text-faint)', whiteSpace: 'nowrap',
}

const triggerSt: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px', minHeight: 36,
  border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-card)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
}
const panelSt = (pos: { top: number; left: number; up: boolean }): React.CSSProperties => ({
  position: 'fixed', zIndex: 300, left: pos.left, width: 284,
  top: pos.up ? undefined : pos.top, bottom: pos.up ? window.innerHeight - pos.top : undefined,
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
  boxShadow: 'var(--shadow-lg)', padding: 12,
})
const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, lineHeight: 1, fontFamily: 'var(--sans)',
}

export function DatePicker({ value, onChange, min, max, bare }: {
  value: string            // "YYYY-MM-DD"
  onChange: (v: string) => void
  min?: string
  max?: string
  bare?: boolean           // ข้อความล้วน ไม่มีกรอบ/ไอคอน (ฝังในชิปตัวกรองตาม Figma)
}) {
  const { open, setOpen, btnRef, panelRef, pos, openPanel } = usePanel()
  const sel = parseISO(value) ?? parseISO(max) ?? [new Date().getFullYear(), new Date().getMonth(), new Date().getDate()]!
  const [vy, setVy] = useState(sel[0])
  const [vm, setVm] = useState(sel[1])

  const show = () => { setVy(sel[0]); setVm(sel[1]); openPanel() }
  const nav = (d: number) => {
    const total = vy * 12 + vm + d
    setVy(Math.floor(total / 12))
    setVm(((total % 12) + 12) % 12)
  }
  const disabled = (s: string) => (!!min && s < min) || (!!max && s > max)

  // ตาราง 6 สัปดาห์ (เริ่มวันอาทิตย์)
  const firstDow = new Date(vy, vm, 1).getDay()
  const dim = new Date(vy, vm + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const todayISO = iso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : show())}
        style={bare ? bareTriggerSt : triggerSt}>
        {!bare && calIcon}{thShort(value)}
      </button>
      {open && createPortal(
        <div ref={panelRef} style={panelSt(pos)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => nav(-1)} style={navBtn}>‹</button>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{TH_M_FULL[vm]} {vy + 543}</span>
            <button type="button" onClick={() => nav(1)} style={navBtn}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {TH_WD.map((w) => <div key={w} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', padding: '3px 0' }}>{w}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const s = iso(vy, vm, d)
              const isSel = s === value
              const dis = disabled(s)
              return (
                <button type="button" key={i} disabled={dis}
                  onClick={() => { onChange(s); setOpen(false) }}
                  style={{
                    height: 32, borderRadius: 8, fontFamily: 'var(--sans)', fontSize: 12.5, cursor: dis ? 'default' : 'pointer',
                    border: s === todayISO && !isSel ? '1px solid var(--accent)' : '1px solid transparent',
                    background: isSel ? 'var(--accent)' : 'transparent',
                    color: isSel ? 'var(--bg)' : dis ? 'var(--text-faint)' : 'var(--text)',
                    fontWeight: isSel || s === todayISO ? 700 : 500,
                    opacity: dis ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (!dis && !isSel) e.currentTarget.style.background = 'var(--surface-card)' }}
                  onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                  {d}
                </button>
              )
            })}
          </div>
          {(!max || todayISO <= max) && (
            <button type="button" onClick={() => { onChange(todayISO); setOpen(false) }}
              style={{ marginTop: 8, width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-card)', color: 'var(--text-dim)', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              วันนี้
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

export function MonthPicker({ value, onChange, max }: {
  value: string            // "YYYY-MM"
  onChange: (v: string) => void
  max?: string
}) {
  const { open, setOpen, btnRef, panelRef, pos, openPanel } = usePanel()
  const cur = /^(\d{4})-(\d{2})/.exec(value)
  const y0 = cur ? Number(cur[1]) : new Date().getFullYear()
  const m0 = cur ? Number(cur[2]) - 1 : new Date().getMonth()
  const [vy, setVy] = useState(y0)
  const show = () => { setVy(y0); openPanel() }
  const mk = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : show())} style={triggerSt}>
        {calIcon}{TH_M[m0]} {y0 + 543}
      </button>
      {open && createPortal(
        <div ref={panelRef} style={{ ...panelSt(pos), width: 250 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setVy(vy - 1)} style={navBtn}>‹</button>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>พ.ศ. {vy + 543}</span>
            <button type="button" onClick={() => setVy(vy + 1)} style={navBtn}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {TH_M.map((m, i) => {
              const s = mk(vy, i)
              const dis = !!max && s > max
              const isSel = s === value
              return (
                <button type="button" key={m} disabled={dis}
                  onClick={() => { onChange(s); setOpen(false) }}
                  style={{
                    padding: '9px 0', borderRadius: 8, border: '1px solid transparent', fontFamily: 'var(--sans)', fontSize: 12.5,
                    cursor: dis ? 'default' : 'pointer',
                    background: isSel ? 'var(--accent)' : 'var(--surface-card)',
                    color: isSel ? 'var(--bg)' : dis ? 'var(--text-faint)' : 'var(--text)',
                    fontWeight: isSel ? 700 : 500, opacity: dis ? 0.45 : 1,
                  }}>
                  {m}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
