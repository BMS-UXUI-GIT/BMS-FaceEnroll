import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// dropdown ค้นหาได้ (แทน native select ที่หน้าตาไม่เข้าธีม)
// panel เป็น portal + position fixed — ไม่โดน overflow ของ card/modal ตัด

export type SelectOpt = { value: string; label: string; sub?: string }

// ชิปที่โชว์บนปุ่มตอนเลือกหลายอัน — เกินนี้ยุบเป็น +N
const CHIP_MAX = 3

const caret = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', opacity: 0.6 }}><path d="m6 9 6 6 6-6" /></svg>
)

export function SearchSelect({ options, value, onChange, multi, values, onToggle, onClear, placeholder = 'เลือก…', searchPlaceholder = 'พิมพ์เลขหรือชื่อเพื่อค้นหา…', bare, hideCaret, width, maxTriggerWidth, disabled, allowCustom, onSearch, renderTrigger, triggerStyle }: {
  options: SelectOpt[]
  value?: string
  onChange?: (v: string) => void
  multi?: boolean            // เลือกได้หลายอัน (toggle) — panel ไม่ปิดตอนเลือก
  values?: string[]
  onToggle?: (v: string) => void
  /** ล้างทุกค่าที่เลือก — มีค่านี้ถึงจะโชว์ปุ่ม "ล้างตัวเลือก" ในเมนู */
  onClear?: () => void
  placeholder?: string
  searchPlaceholder?: string
  bare?: boolean             // trigger โปร่ง ไม่มีกรอบ (ฝังใน pill เดิมได้)
  hideCaret?: boolean        // ซ่อนลูกศรลง (Figma ชิปตัวกรองไม่มีลูกศร)
  width?: number | string
  maxTriggerWidth?: number
  disabled?: boolean
  allowCustom?: boolean      // พิมพ์รหัสตัวเลข 4-6 หลักที่ไม่มีในรายการแล้วเลือกใช้ได้
  onSearch?: (q: string) => Promise<SelectOpt[]>  // ค้นสดจาก backend (เช่นทะเบียนโรงทั้งประเทศ) — ผลค้นแทน options ตอนพิมพ์
  /** วาด trigger เอง (เช่นการ์ดบน header) — ทั้งก้อนกลายเป็นปุ่มเปิดเมนู */
  renderTrigger?: (selected: SelectOpt | undefined) => React.ReactNode
  triggerStyle?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [act, setAct] = useState(0)
  const [remote, setRemote] = useState<SelectOpt[] | null>(null) // ผลค้นสดของ q ปัจจุบัน (null = ยังไม่ค้น/ค้นไม่ได้)
  const [searching, setSearching] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 260, up: false })

  // live search แบบ debounce — ผลลัพธ์ของคำค้นล่าสุดเท่านั้นที่ถูกใช้
  useEffect(() => {
    if (!onSearch || !open) return
    const term = q.trim()
    if (!term) { setRemote(null); setSearching(false); return }
    let alive = true
    setSearching(true)
    const t = setTimeout(() => {
      onSearch(term)
        .then((r) => { if (alive) setRemote(r) })
        .catch(() => { if (alive) setRemote(null) })
        .finally(() => { if (alive) setSearching(false) })
    }, 300)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open])

  const openPanel = () => {
    if (disabled) return
    const r = btnRef.current!.getBoundingClientRect()
    const w = Math.max(r.width, 280)
    const up = window.innerHeight - r.bottom < 360 && r.top > 360
    const centered = r.left + r.width / 2 - w / 2
    // เว้นจาก trigger 8px (24 ห่างจนดูหลุดจากปุ่ม)
    setPos({ top: up ? r.top - 8 : r.bottom + 8, left: Math.max(8, Math.min(centered, window.innerWidth - w - 12)), width: w, up })
    setQ(''); setAct(0); setOpen(true)
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

  const t = q.trim().toLowerCase()
  const local = useMemo(
    () => options.filter((o) => !t || o.label.toLowerCase().includes(t) || o.value.toLowerCase().includes(t) || (o.sub || '').toLowerCase().includes(t)),
    [options, t],
  )
  // มี onSearch + พิมพ์คำค้นแล้ว → ใช้ผลค้นสด (รวมกับที่ตรงใน options เดิม ไม่ให้ซ้ำ)
  const shown = onSearch && t && remote !== null
    ? [...local, ...remote.filter((r) => !local.some((o) => o.value === r.value))]
    : local
  const customCode = allowCustom && /^\d{4,6}$/.test(q.trim()) && !shown.some((o) => o.value === q.trim()) ? q.trim() : null
  const list: SelectOpt[] = customCode ? [...shown, { value: customCode, label: `ใช้รหัส “${customCode}” นี้`, sub: customCode }] : shown

  const pick = (v: string) => {
    if (multi) onToggle?.(v)
    else { onChange?.(v); setOpen(false) }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(a + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[act]) pick(list[act].value) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const selected = multi
    ? options.filter((o) => values?.includes(o.value))
    : options.find((o) => o.value === value)
  // ค่าที่เลือกแต่ไม่อยู่ใน options (เช่นรหัสที่พิมพ์เอง) — โชว์เป็นเลขตรงๆ
  const extraVals = multi ? (values ?? []).filter((v) => !options.some((o) => o.value === v)) : []

  const trigger: React.CSSProperties = renderTrigger
    ? { border: 'none', background: 'transparent', padding: 0, cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--sans)', textAlign: 'left', ...triggerStyle }
    : bare
    ? { display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--text)', padding: 0, minWidth: 0, width }
    : {
        display: 'flex', alignItems: 'center', gap: 8, width: width ?? '100%', minHeight: 36, padding: '6px 11px',
        border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-card)', color: 'var(--text)',
        fontFamily: 'var(--sans)', fontSize: 13, cursor: disabled ? 'default' : 'pointer', textAlign: 'left', opacity: disabled ? 0.6 : 1,
      }

  const allChips = multi
    ? [...(selected as SelectOpt[]).map((o) => ({ key: o.value, text: o.sub ? `${o.sub} ${o.label}` : o.label })),
       ...extraVals.map((v) => ({ key: v, text: v }))]
    : []
  const chips = allChips.length > 0
  return (
    <>
      <button type="button" ref={btnRef} onClick={() => (open ? setOpen(false) : openPanel())} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} style={trigger}>
        {renderTrigger ? renderTrigger(multi ? undefined : (selected as SelectOpt | undefined)) : chips ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {allChips.slice(0, CHIP_MAX).map((c) => (
              <span key={c.key} style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.6, padding: '2px 8px', borderRadius: 6, background: 'var(--accent-light)', color: 'var(--accent-active)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.text}</span>
            ))}
            {/* เลือกเกิน CHIP_MAX → ยุบส่วนเกินเป็น +N (ชื่อเต็มดูได้จาก tooltip) กันชิปล้นหลายบรรทัด */}
            {allChips.length > CHIP_MAX && (
              <span title={allChips.slice(CHIP_MAX).map((c) => c.text).join(', ')}
                style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.6, padding: '2px 8px', borderRadius: 6, background: 'var(--surface-alt)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                +{allChips.length - CHIP_MAX}
              </span>
            )}
          </span>
        ) : (
          <span style={{ flex: 1, minWidth: 0, lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: maxTriggerWidth, color: (multi ? false : !!selected) ? 'var(--text)' : 'var(--text-faint)', fontWeight: bare ? 500 : 500 }}>
            {multi ? placeholder : (selected as SelectOpt | undefined)?.label ?? placeholder}
          </span>
        )}
        {!hideCaret && caret}
      </button>

      {open && createPortal(
        <div ref={panelRef} style={{
          position: 'fixed', zIndex: 300, left: pos.left, width: pos.width,
          top: pos.up ? undefined : pos.top, bottom: pos.up ? window.innerHeight - pos.top : undefined,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus value={q} onChange={(e) => { setQ(e.target.value); setAct(0) }} onKeyDown={onKey} placeholder={searchPlaceholder}
              style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-card)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }}
            />
          </div>
          {/* แถบสรุป + ล้างตัวเลือก — โผล่เมื่อเลือกไว้แล้วและเจ้าของ component ส่ง onClear มา */}
          {onClear && (multi ? (values ?? []).length > 0 : !!value) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              padding: '6px 10px 6px 12px', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                {multi ? `เลือกแล้ว ${(values ?? []).length}` : 'เลือกแล้ว 1'}
              </span>
              <button type="button" onClick={() => { onClear(); setOpen(false) }} style={{
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)',
                fontSize: 12, fontWeight: 500, color: 'var(--danger)', padding: '4px 6px', borderRadius: 6,
              }}>ล้างตัวเลือก</button>
            </div>
          )}
          <div style={{ overflowY: 'auto', maxHeight: 272, padding: 4 }}>
            {searching && <div style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--text-faint)' }}>กำลังค้นหา…</div>}
            {!searching && list.length === 0 && (
              <div style={{ padding: '14px 12px', fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center' }}>
                {onSearch && !t ? 'พิมพ์เลขหรือชื่อโรงพยาบาลเพื่อค้นหา' : 'ไม่พบรายการ'}
              </div>
            )}
            {list.map((o, i) => {
              const on = multi ? values?.includes(o.value) : o.value === value
              return (
                <button type="button" key={`${o.value}:${i}`} onClick={() => pick(o.value)} onMouseEnter={() => setAct(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', background: i === act ? 'var(--surface-card)' : 'transparent', color: 'var(--text)',
                }}>
                  {o.sub && <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 500, color: 'var(--accent-active)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: 6, flex: 'none' }}>{o.sub}</span>}
                  <span style={{ flex: 1, fontSize: 13, lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: on ? 500 : 500 }}>{o.label}</span>
                  {on && <span style={{ color: 'var(--accent-active)', fontWeight: 500, flex: 'none' }}>✓</span>}
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
