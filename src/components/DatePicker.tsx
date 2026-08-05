import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Button as AriaButton, Calendar, CalendarCell, CalendarGrid, CalendarGridBody,
  CalendarGridHeader, CalendarHeaderCell, Dialog, DialogTrigger, Heading, I18nProvider, Popover,
} from 'react-aria-components'
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'

// ปฏิทินเลือกวันที่/เดือน — เข้าธีมเอง (แทน <input type=date> ของ system)
//
// DatePicker  = react-aria-components (Calendar + Popover) ครอบด้วย I18nProvider
//               locale 'th-TH-u-ca-buddhist' -> ปฏิทินขึ้น พ.ศ. + เดือน/วันภาษาไทยเอง
//               ไม่ต้องแปลงปีเอง และได้คีย์บอร์ด/screen reader/โฟกัสครบตามมาตรฐาน ARIA
//               หน้าตาคุมด้วยคลาส .dp-* ใน theme.css (ตัว library ไม่มีสไตล์มาให้)
// MonthPicker = ยังเขียนเอง (react-aria ไม่มีตัวเลือกเดือน) — panel เป็น portal แบบ SearchSelect
//
// API ข้างนอกยังเป็นสตริง "YYYY-MM-DD" เหมือนเดิมทุกอย่าง 7 หน้าจอที่เรียกใช้ไม่ต้องแก้

export const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

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

  const openPanel = (width = 284) => {
    const r = btnRef.current!.getBoundingClientRect()
    const up = window.innerHeight - r.bottom < 360 && r.top > 360
    const centered = r.left + r.width / 2 - width / 2
    setPos({ top: up ? r.top - 24 : r.bottom + 24, left: Math.max(8, Math.min(centered, window.innerWidth - width - 8)), up })
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

const triggerSt: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px', minHeight: 36,
  border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-card)', color: 'var(--text)',
  fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
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

/** แปลง "YYYY-MM-DD" -> CalendarDate (ค่าที่พังหรือว่าง = undefined) */
const toCal = (s?: string | null): CalendarDate | undefined => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  try { return parseDate(s) } catch { return undefined }
}

export function DatePicker({ value, onChange, min, max, bare }: {
  value: string            // "YYYY-MM-DD"
  onChange: (v: string) => void
  min?: string
  max?: string
  bare?: boolean           // ข้อความล้วน ไม่มีกรอบ/ไอคอน (ฝังในชิปตัวกรองตาม Figma)
}) {
  const sel = toCal(value)
  const todayCal = today(getLocalTimeZone())
  const todayISO = todayCal.toString()
  const canPickToday = (!max || todayISO <= max) && (!min || todayISO >= min)

  return (
    <I18nProvider locale="th-TH-u-ca-buddhist">
      <DialogTrigger>
        {/* RAC ใส่ aria-haspopup/aria-expanded ให้เอง — ชิปตัวกรองใช้ค่านี้ทำสถานะ "เปิดอยู่" */}
        <AriaButton className={bare ? 'dp-trigger-bare' : 'dp-trigger'}>
          {!bare && calIcon}{thShort(value)}
        </AriaButton>
        <Popover className="dp-popover" placement="bottom" offset={24}>
          <Dialog className="dp-dialog" aria-label="เลือกวันที่">
            {({ close }) => (
              <>
                <Calendar
                  value={sel ?? null}
                  defaultFocusedValue={sel ?? toCal(max) ?? todayCal}
                  minValue={toCal(min)}
                  maxValue={toCal(max)}
                  onChange={(d) => { onChange(d.toString()); close() }}
                >
                  <header className="dp-head">
                    <AriaButton slot="previous" className="dp-nav" aria-label="เดือนก่อนหน้า">‹</AriaButton>
                    <Heading className="dp-title" />
                    <AriaButton slot="next" className="dp-nav" aria-label="เดือนถัดไป">›</AriaButton>
                  </header>
                  {/* narrow = "อา จ อ ..." (short ของ locale ไทยคือชื่อเต็ม กว้างเกินช่อง) */}
                  <CalendarGrid className="dp-grid" weekdayStyle="narrow">
                    <CalendarGridHeader>
                      {(day) => <CalendarHeaderCell className="dp-wd">{day}</CalendarHeaderCell>}
                    </CalendarGridHeader>
                    <CalendarGridBody>
                      {(date) => <CalendarCell date={date} className="dp-cell" />}
                    </CalendarGridBody>
                  </CalendarGrid>
                </Calendar>
                {canPickToday && (
                  <button type="button" className="dp-today"
                    onClick={() => { onChange(todayISO); close() }}>
                    วันนี้
                  </button>
                )}
              </>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </I18nProvider>
  )
}

export function MonthPicker({ value, onChange, max, bare }: {
  value: string            // "YYYY-MM"
  onChange: (v: string) => void
  max?: string
  /** ไม่มีกรอบ/พื้น — ใช้ตอนวางเป็นค่าใน FilterChip (ชิปเป็นกรอบให้อยู่แล้ว) */
  bare?: boolean
}) {
  const { open, setOpen, btnRef, panelRef, pos, openPanel } = usePanel()
  const cur = /^(\d{4})-(\d{2})/.exec(value)
  const y0 = cur ? Number(cur[1]) : new Date().getFullYear()
  const m0 = cur ? Number(cur[2]) - 1 : new Date().getMonth()
  const [vy, setVy] = useState(y0)
  const show = () => { setVy(y0); openPanel(250) }
  const mk = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : show())}
        style={bare
          ? { border: 0, background: 'none', padding: 0, minHeight: 0, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-faint)', whiteSpace: 'nowrap' }
          : triggerSt}>
        {bare ? null : calIcon}{TH_M[m0]} {y0 + 543}
      </button>
      {open && createPortal(
        <div ref={panelRef} style={{ ...panelSt(pos), width: 250 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setVy(vy - 1)} style={navBtn}>‹</button>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>พ.ศ. {vy + 543}</span>
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
                    fontWeight: isSel ? 500 : 500, opacity: dis ? 0.45 : 1,
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

/** "2026-08" -> "ส.ค. 69" */
export const thMonth = (s?: string | null) => {
  const m = /^(\d{4})-(\d{2})$/.exec(s ?? '')
  return m ? `${TH_M[Number(m[2]) - 1]} ${(Number(m[1]) + 543) % 100}` : '—'
}

/** เลือกช่วงเดือน (เดือนไหน ถึง เดือนไหน) — คลิกแรก = เดือนเริ่ม คลิกสอง = เดือนจบ
    คลิกย้อนหลังกว่าเดือนเริ่ม = สลับให้เอง · เดือนระหว่างกลางไฮไลต์จาง */
export function MonthRangePicker({ from, to, onChange, max, bare }: {
  from: string             // "YYYY-MM"
  to: string               // "YYYY-MM"
  onChange: (from: string, to: string) => void
  max?: string             // "YYYY-MM"
  bare?: boolean
}) {
  const { open, setOpen, btnRef, panelRef, pos, openPanel } = usePanel()
  const y0 = Number(/^(\d{4})/.exec(to)?.[1] ?? new Date().getFullYear())
  const [vy, setVy] = useState(y0)
  // เดือนเริ่มที่เพิ่งคลิก (ยังรอคลิกที่สอง) — null = คลิกถัดไปเริ่มช่วงใหม่
  const [pending, setPending] = useState<string | null>(null)
  const show = () => { setVy(y0); setPending(null); openPanel(280) }
  const mk = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`

  const pick = (s: string) => {
    if (pending == null) { setPending(s); return }
    const [a, b] = pending <= s ? [pending, s] : [s, pending]
    setPending(null)
    onChange(a, b)
    setOpen(false)
  }

  return (
    <>
      <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : show())}
        style={bare
          ? { border: 0, background: 'none', padding: 0, minHeight: 0, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-faint)', whiteSpace: 'nowrap' }
          : triggerSt}>
        {bare ? null : calIcon}{from === to ? thMonth(to) : `${thMonth(from)} – ${thMonth(to)}`}
      </button>
      {open && createPortal(
        <div ref={panelRef} style={{ ...panelSt(pos), width: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setVy(vy - 1)} style={navBtn}>‹</button>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>พ.ศ. {vy + 543}</span>
            <button type="button" onClick={() => setVy(vy + 1)} style={navBtn}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {TH_M.map((m, i) => {
              const s = mk(vy, i)
              const dis = !!max && s > max
              // ระหว่างรอคลิกที่สอง ให้ไฮไลต์แค่เดือนที่เพิ่งเลือก (ยังไม่รู้ปลายทาง)
              const edge = pending != null ? s === pending : s === from || s === to
              const inRange = pending == null && s > from && s < to
              return (
                <button type="button" key={m} disabled={dis}
                  onClick={() => pick(s)}
                  style={{
                    padding: '9px 0', borderRadius: 8, border: '1px solid transparent', fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500,
                    cursor: dis ? 'default' : 'pointer',
                    background: edge ? 'var(--accent)' : inRange ? 'var(--accent-light)' : 'var(--surface-card)',
                    color: edge ? 'var(--bg)' : dis ? 'var(--text-faint)' : 'var(--text)',
                    opacity: dis ? 0.45 : 1,
                  }}>
                  {m}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
            {pending != null ? `เริ่ม ${thMonth(pending)} — เลือกเดือนสุดท้าย` : 'เลือกเดือนเริ่มต้น'}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
