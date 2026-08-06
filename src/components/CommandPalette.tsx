import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import { useApp, type Nav } from '../state'
import { Icon } from '../icons'
import { TEXT } from '../typography'

// ค้นหาทั้งระบบ (command palette) — เปิดด้วย ⌘K / Ctrl+K หรือ "/" หรือกดช่องค้นหาบน header
// ค้นได้ 3 อย่าง: เมนู (เฉพาะที่บัญชีนี้มีสิทธิ์) · โรงพยาบาลในสิทธิ์ · พนักงานของโรงที่กำลังดู
// เลือกแล้วพาไปหน้านั้น/สลับโรงให้เลย · ↑↓ เลื่อน · Enter เลือก · Esc ปิด
// เมนูที่เพิ่งใช้เก็บใน localStorage — เปิดมาแล้วเห็นของที่ใช้บ่อยก่อนพิมพ์

const RECENT_KEY = 'facecheck_palette_recent'
const RECENT_MAX = 6

/** ดัชนีเมนูทั้งระบบ — ชื่อ/คำพ้อง/ไอคอน ตรงกับแถบเมนูซ้าย */
type MenuEntry = { nav: Nav; label: string; group: string; icon: string; alias?: string }
const MENUS: MenuEntry[] = [
  { nav: 'overview', label: 'หน้าหลัก', group: 'มอนิเตอร์', icon: 'overview', alias: 'dashboard ภาพรวม แดชบอร์ด' },
  { nav: 'face', label: 'ลงทะเบียนใบหน้า', group: 'มอนิเตอร์', icon: 'face', alias: 'face enroll สแกนหน้า ใบหน้า' },
  { nav: 'attendance', label: 'ลงเวลา', group: 'มอนิเตอร์', icon: 'clock', alias: 'attendance เข้างาน ออกงาน ตอกบัตร' },
  { nav: 'rp-person', label: 'รายบุคคล', group: 'รายงาน · วิเคราะห์', icon: 'person', alias: 'พนักงาน รายคน staff' },
  { nav: 'rp-dept', label: 'รายแผนก', group: 'รายงาน · วิเคราะห์', icon: 'people', alias: 'department แผนก' },
  { nav: 'rp-shift', label: 'รายเวร', group: 'รายงาน · วิเคราะห์', icon: 'calendar', alias: 'shift เวร กะ' },
  { nav: 'rp-late', label: 'การมาสาย / ออกก่อน', group: 'รายงาน · วิเคราะห์', icon: 'clock-alert', alias: 'late early สาย ออกก่อน' },
  { nav: 'settings', label: 'ตั้งค่าแอปสแกน', group: 'โรงพยาบาล', icon: 'system', alias: 'policy liveness นโยบาย ตั้งค่า' },
  { nav: 'locations', label: 'จุดลงเวลา', group: 'โรงพยาบาล', icon: 'map-pin', alias: 'gps พิกัด รัศมี geofence' },
  { nav: 'hosp-audit', label: 'ประวัติการจัดการ', group: 'โรงพยาบาล', icon: 'clock', alias: 'audit log ประวัติ' },
  { nav: 'sys-approve', label: 'อนุมัติโรงพยาบาล', group: 'จัดการระบบ', icon: 'hospital', alias: 'approve คำขอ ลงทะเบียนโรง' },
  { nav: 'sys-hospitals', label: 'จัดการโรงพยาบาล', group: 'จัดการระบบ', icon: 'hospital', alias: 'tenant โรงพยาบาล ต่ออายุ' },
  { nav: 'sys-users', label: 'ผู้ใช้และสิทธิ์', group: 'จัดการระบบ', icon: 'people', alias: 'user permission บัญชี สิทธิ์' },
  { nav: 'sys-audit', label: 'ประวัติการจัดการ (ทุกโรงพยาบาล)', group: 'จัดการระบบ', icon: 'clock', alias: 'audit log ประวัติ' },
  { nav: 'health', label: 'สถานะระบบ', group: 'จัดการระบบ', icon: 'health', alias: 'health status เซิร์ฟเวอร์' },
  { nav: 'help', label: 'ช่วยเหลือ', group: 'อื่น ๆ', icon: 'info', alias: 'help คู่มือ วิธีใช้' },
]

type Row =
  | { kind: 'menu'; id: string; entry: MenuEntry }
  | { kind: 'hospital'; id: string; value: string; label: string }
  | { kind: 'employee'; id: string; emp: string; name: string; dept?: string }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function CommandPalette({ open, onClose, allowed }: {
  open: boolean
  onClose: () => void
  /** เมนูที่บัญชีนี้เปิดได้ (ส่งมาจาก App) */
  allowed: (n: Nav) => boolean
}) {
  const { session, isSuper, setNav, setHcode, currentHcode } = useApp()
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [emps, setEmps] = useState<{ emp: string; name: string; dept?: string }[]>([])
  const [recent, setRecent] = useState<string[]>(readRecent)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // เปิดใหม่ = เคลียร์คำค้นแล้วโฟกัสช่องค้นหา
  useEffect(() => {
    if (!open) return
    setQ(''); setHi(0); setEmps([]); setRecent(readRecent())
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [open])

  // ค้นพนักงานของโรงที่กำลังดู (หน่วง 300ms) — โรงยังไม่เลือก/ทุกโรงก็ข้าม
  useEffect(() => {
    const term = q.trim()
    if (!open || !term || currentHcode === '*') { setEmps([]); return }
    let alive = true
    const t = setTimeout(() => {
      api.get<{ rows: { emp: string; name: string; dept?: string }[] }>(
        `/admin/employees?hcode=${encodeURIComponent(currentHcode)}&q=${encodeURIComponent(term)}&limit=5&offset=0`)
        .then((d) => alive && setEmps(d.rows ?? []))
        .catch(() => alive && setEmps([]))
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [q, open, currentHcode])

  const menus = useMemo(() => MENUS.filter((m) => allowed(m.nav)), [allowed])

  const rows = useMemo<Row[]>(() => {
    const term = norm(q)
    // ยังไม่พิมพ์ = เมนูที่เพิ่งใช้ (ไม่มีก็เอา 5 เมนูแรกที่มีสิทธิ์)
    if (!term) {
      const byNav = new Map(menus.map((m) => [m.nav as string, m]))
      const rec = recent.map((n) => byNav.get(n)).filter((m): m is MenuEntry => !!m)
      const list = rec.length ? rec : menus.slice(0, 5)
      return list.map((entry) => ({ kind: 'menu' as const, id: `m:${entry.nav}`, entry }))
    }
    const menuRows: Row[] = menus
      .filter((m) => norm(`${m.label}${m.group}${m.alias ?? ''}`).includes(term))
      .map((entry) => ({ kind: 'menu', id: `m:${entry.nav}`, entry }))

    const hospRows: Row[] = (isSuper || (session?.hospitals.length ?? 0) > 1)
      ? (session?.hospitals ?? [])
          .filter((h) => norm(`${h.label}${h.value}`).includes(term))
          .slice(0, 5)
          .map((h) => ({ kind: 'hospital', id: `h:${h.value}`, value: h.value, label: h.label }))
      : []

    const empRows: Row[] = emps.map((e) => ({ kind: 'employee', id: `e:${e.emp}`, emp: e.emp, name: e.name, dept: e.dept }))
    return [...menuRows, ...hospRows, ...empRows]
  }, [q, menus, recent, session, isSuper, emps])

  // เลื่อนแถวที่ไฮไลต์ให้อยู่ในสายตาเสมอ
  useEffect(() => {
    if (hi >= rows.length) setHi(Math.max(0, rows.length - 1))
    listRef.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [hi, rows.length])

  const pushRecent = (nav: string) => {
    const next = [nav, ...recent.filter((x) => x !== nav)].slice(0, RECENT_MAX)
    setRecent(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* โหมดส่วนตัวเขียนไม่ได้ ก็ข้ามไป */ }
  }

  const pick = (r: Row) => {
    if (r.kind === 'menu') { pushRecent(r.entry.nav); setNav(r.entry.nav) }
    else if (r.kind === 'hospital') setHcode(r.value)
    else setNav('rp-person')   // พนักงาน -> หน้ารายบุคคล (ค้นชื่อซ้ำในหน้านั้นได้)
    onClose()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(rows.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = rows[hi]; if (r) pick(r) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  if (!open) return null

  const showingRecent = !q.trim()

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 400, padding: 20,
      background: 'color-mix(in srgb, var(--text) 25%, transparent)',
      backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="ค้นหาทั้งระบบ" className="page-in" style={{
        marginTop: '12vh', width: 'min(640px, 100%)',
        background: 'var(--bg)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* ช่องค้นหา */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--control-border)' }}>
          <Icon name="search" size={20} width={1.8} color="var(--text-faint)" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} onKeyDown={onKey}
            placeholder="ค้นหาเมนู · โรงพยาบาล · พนักงาน…"
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--text)' }} />
          <kbd style={{
            ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)',
            padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--surface-alt)', whiteSpace: 'nowrap',
          }}>ESC</kbd>
        </div>

        {/* ผลลัพธ์ */}
        <div ref={listRef} style={{ maxHeight: '52vh', overflowY: 'auto', padding: 'var(--sp-2)' }}>
          {rows.length === 0 ? (
            <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
              ไม่พบสิ่งที่ค้นหา
            </div>
          ) : (
            <>
              <div style={{ ...TEXT.caption, color: 'var(--text-dim)', padding: 'var(--sp-2) var(--sp-3)' }}>
                {showingRecent ? 'ใช้ล่าสุด' : 'ผลการค้นหา'}
              </div>
              {rows.map((r, i) => (
                <button key={r.id} data-i={i} type="button" onClick={() => pick(r)} onMouseEnter={() => setHi(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
                    padding: 'var(--sp-2) var(--sp-3)', minHeight: 52, border: 'none', cursor: 'pointer',
                    borderRadius: 'var(--r-lg)', fontFamily: 'var(--sans)',
                    background: i === hi ? 'var(--surface-alt)' : 'transparent',
                  }}>
                  <span aria-hidden style={{
                    width: 34, height: 34, flex: 'none', borderRadius: 'var(--r-md)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--accent-light)', color: 'var(--accent-active)',
                  }}>
                    <Icon name={r.kind === 'menu' ? r.entry.icon : r.kind === 'hospital' ? 'hospital' : 'person'} size={18} width={1.8} />
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.kind === 'menu' ? r.entry.label : r.kind === 'hospital' ? r.label : r.name}
                    </span>
                    <span style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.kind === 'menu' ? r.entry.group
                        : r.kind === 'hospital' ? `เปลี่ยนไปดูข้อมูลของโรงพยาบาลนี้ · ${r.value}`
                        : `พนักงาน · ${r.emp}${r.dept ? ` · ${r.dept}` : ''}`}
                    </span>
                  </span>

                  {i === hi && (
                    <kbd style={{
                      ...TEXT.caption, fontFamily: 'var(--mono)', color: 'var(--text-dim)', flex: 'none',
                      padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg)',
                    }}>↵</kbd>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* คำใบ้ปุ่มลัด */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
          padding: 'var(--sp-3) var(--sp-5)', borderTop: '1px solid var(--control-border)',
          ...TEXT.sm, color: 'var(--text-dim)',
        }}>
          <span>↑↓ เลื่อน</span><span>↵ เลือก</span><span>esc ปิด</span>
          <span style={{ marginLeft: 'auto' }}>เปิดด้วย ⌘K / Ctrl+K</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
