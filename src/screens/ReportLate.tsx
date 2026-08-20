import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { ErrorBox } from '../components/feedback/Message'
import { clock, nf, useFetch } from '../hooks'
import { filterQS, isoAddDays, localISO, selLabel, toggle, useAttFilterOptions } from '../components/AttFilters'
import { thShort } from '../components/DatePicker'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { PickHospital } from '../components/PickHospital'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterBar } from '../components/inputs/FilterBar'
import { Button } from '../components/inputs/Button'
import { FilterChip } from '../components/inputs/FilterChip'
import { Avatar } from '../components/data-display/Avatar'
import { shiftKindOf, type ShiftKind } from '../components/data-display/ShiftBadge'
import { StatCard } from '../components/data-display/StatCard'
import { Pagination } from '../components/data-display/Pagination'
import { PAGE_SIZE } from '../components/Pager'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'

// การมาสาย / ออกก่อน — Figma node 114:33516
//   การ์ดหัวเรื่อง: ชิปช่วงวัน/เวร/แผนก · การ์ดสรุป 2 ใบ · แถบเกณฑ์ · ภาพประกอบ
//   2 แผงคู่: รายชื่อพนักงานที่มาสาย / ที่ออกก่อนเวลา (การ์ดต่อคน ไม่ใช่ตาราง)
//
// แบ่งหน้าฝั่งเซิร์ฟเวอร์ — analytics ครั้งเดียวคืนทั้งสองฝั่ง แยก offset กันด้วย late_offset/early_offset

// late_min/early_min มาคู่กันทั้งสองฝั่ง (backend ใหม่) — เก่าส่งมาแค่ min ของฝั่งตัวเอง ก็ยังแสดงได้
type SideRow = {
  emp: string; name: string; dept: string; date: string; shift: string
  /** รอบที่เท่าไรของวันนั้น — คนควบกะมีหลายรอบต่อวัน (ไม่มี = ถือว่ารอบเดียว) */
  seq?: number
  in?: string; out?: string; min: number; late_min?: number; early_min?: number
}
type Analytics = {
  late_total: number   // จำนวนจริงทั้งหมด (late_rows โดนตัดตาม limit)
  early_total: number
  late_rows: SideRow[]
  early_rows: SideRow[]
}

/** แถวแสดงผลร่วมของ 2 มุมมอง — โชว์ครบทั้งเข้า/สาย/ออก/ออกก่อน (ตัวกรองแค่เลือกว่าเห็นใคร) */
type IssueRow = {
  emp: string; name: string; dept: string; date: string; shift: string; seq: number
  in: string; out: string; late_min: number; early_min: number
}

// Topbar เป็นแถบกระจกลอยทับ (App.tsx) — เลื่อนอัตโนมัติต้องเผื่อความสูงนี้
const TOPBAR = 80

const deptName = (d?: string) => (d && d.trim() !== '' ? d : 'ไม่ระบุแผนก')

// ป้ายเวรมุมขวาล่างของรูป — ไอคอนเดียวกับ ShiftBadge (เช้า/บ่าย/ดึก)
const SHIFT_ICON: Record<ShiftKind, string> = { morning: 'haze', afternoon: 'sun', night: 'moon' }

function AvatarWithShift({ name, seed, shift, size = 40 }: { name: string; seed: string; shift: string; size?: number }) {
  const kind = shiftKindOf(shift)
  return (
    <span style={{ position: 'relative', flex: 'none', lineHeight: 0 }} title={shift || undefined}>
      <Avatar name={name} seed={seed} size={size} />
      <span aria-hidden style={{
        position: 'absolute', right: -2, bottom: -2,
        width: 18, height: 18, borderRadius: 'var(--r-full)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `var(--shift-${kind}-icon)`, color: 'var(--bg)',
        border: '2px solid var(--bg)', boxSizing: 'content-box',
      }}>
        <Icon name={SHIFT_ICON[kind]} size={11} width={2.2} />
      </span>
    </span>
  )
}

/** ช่องข้อมูลท้ายการ์ด (ป้ายเล็กบน + ค่าตัวหนาล่าง) — Figma มีเส้นคั่นซ้ายทุกช่อง */
function Cell({ label, value, unit, color }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div className="late-cell" style={{
      minWidth: 108, flex: 'none',
      padding: 'var(--sp-1) var(--sp-3)', borderLeft: '1px solid var(--control-border)',
    }}>
      <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-1)' }}>
        <span style={{ ...TEXT.h3, color: color ?? 'var(--text)' }}>{value}</span>
        <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{unit}</span>
      </div>
    </div>
  )
}

/** การ์ด 1 คน — รูป + ชื่อ/แผนก + เข้า/สาย/ออก/ออกก่อน ครบทั้ง 4 ช่องทุกมุมมอง
    (ผู้ใช้อยากเห็นในแถวเดียวว่าคนที่มาสาย ออกก่อนด้วยหรือไม่) */
function IssueItem({ r, showDate }: { r: IssueRow; showDate: boolean }) {
  const t = (v: string) => (v ? clock(v).replace(' น.', '') : '—')
  return (
    <div className="row-hover late-row" style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
      padding: 'var(--sp-2) var(--sp-3)',
      border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
    }}>
      <AvatarWithShift name={r.name} seed={r.emp} shift={r.shift} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
        <div style={{ ...TEXT.sm, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deptName(r.dept)}{showDate ? ` · ${thShort(r.date)}` : ''}
        </div>
      </div>
      <Cell label="เวลาเข้า" value={t(r.in)} unit="น." />
      <Cell label="สาย" value={r.late_min > 0 ? nf(r.late_min) : '—'} unit="นาที"
        color={r.late_min > 0 ? 'var(--warn)' : 'var(--text-dim)'} />
      <Cell label="เวลาออก" value={t(r.out)} unit="น." />
      <Cell label="ออกก่อน" value={r.early_min > 0 ? nf(r.early_min) : '—'} unit="นาที"
        color={r.early_min > 0 ? 'var(--info)' : 'var(--text-dim)'} />
    </div>
  )
}

/** ป้ายตัวเลขสรุปบนหัวกลุ่ม (สาย 3 ครั้ง / ออกก่อน 1 ครั้ง) */
function CountChip({ icon, n, label, color, bg }: { icon: string; n: number; label: string; color: string; bg: string }) {
  if (n <= 0) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', whiteSpace: 'nowrap',
      padding: '2px var(--sp-2)', borderRadius: 'var(--r-full)', background: bg, color, ...TEXT.sm,
    }}>
      <Icon name={icon} size={14} width={2} />{label} {nf(n)} ครั้ง
    </span>
  )
}

/** แถวย่อยในกลุ่ม — โหมด 'date' บอกว่า "ใคร" · โหมด 'person' บอกว่า "วันไหน"
    (อีกฝั่งซ้ำกับหัวกลุ่มอยู่แล้ว ไม่ต้องเขียนซ้ำทุกแถว) */
function GroupLine({ r, mode }: { r: IssueRow; mode: 'date' | 'person' }) {
  const t = (v: string) => (v ? clock(v).replace(' น.', '') : '—')
  return (
    <div className="row-hover late-row" style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
      padding: 'var(--sp-2) var(--sp-3)', borderTop: '1px solid var(--control-border)',
    }}>
      {mode === 'date' ? (
        <>
          <AvatarWithShift name={r.name} seed={r.emp} shift={r.shift} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ ...TEXT.sm, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deptName(r.dept)}</div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Icon name="calendar" size={16} width={1.8} color="var(--text-faint)" />
          <span style={{ ...TEXT.bodyMed, color: 'var(--text)', whiteSpace: 'nowrap' }}>{thShort(r.date)}</span>
          <span style={{ ...TEXT.sm, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.shift || '—'}</span>
        </div>
      )}
      <Cell label="เวลาเข้า" value={t(r.in)} unit="น." />
      <Cell label="สาย" value={r.late_min > 0 ? nf(r.late_min) : '—'} unit="นาที"
        color={r.late_min > 0 ? 'var(--warn)' : 'var(--text-dim)'} />
      <Cell label="เวลาออก" value={t(r.out)} unit="น." />
      <Cell label="ออกก่อน" value={r.early_min > 0 ? nf(r.early_min) : '—'} unit="นาที"
        color={r.early_min > 0 ? 'var(--info)' : 'var(--text-dim)'} />
    </div>
  )
}

type IssueGroup = { key: string; rows: IssueRow[]; late: number; early: number }

/** กลุ่มเดียว = การ์ด 1 ใบ (หัวกลุ่มบอกว่า วัน/คนไหน + สรุปจำนวน แล้วแถวย่อยอยู่ข้างใน) */
function GroupCard({ g, mode }: { g: IssueGroup; mode: 'date' | 'person' }) {
  const head = g.rows[0]
  return (
    <div style={{ border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
        padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-alt)',
      }}>
        {mode === 'date' ? (
          <>
            <Icon name="calendar" size={18} width={1.8} color="var(--text-dim)" />
            <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{thShort(g.key)}</span>
            <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{nf(new Set(g.rows.map((r) => r.emp)).size)} คน</span>
          </>
        ) : (
          <>
            <AvatarWithShift name={head.name} seed={head.emp} shift={head.shift} size={32} />
            <span style={{ minWidth: 0 }}>
              <span style={{ ...TEXT.bodyMed, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{head.name}</span>
              <span style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deptName(head.dept)} · {nf(new Set(g.rows.map((r) => r.date)).size)} วัน
              </span>
            </span>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <CountChip icon="clock-alert" n={g.late} label="มาสาย" color="var(--warn)" bg="var(--warn-light)" />
          <CountChip icon="time-duration-off" n={g.early} label="ออกก่อน" color="var(--info)" bg="var(--info-light)" />
        </span>
      </div>
      {g.rows.map((r, i) => <GroupLine key={`${r.emp}:${r.date}:${i}`} r={r} mode={mode} />)}
    </div>
  )
}

/** จัดกลุ่มแถวตามวัน หรือตามคน (คนที่มีปัญหาบ่อยสุดขึ้นก่อน)
    dateAsc = ไล่วันเก่า -> ใหม่ · โหมดตามคน = ลำดับแถวในกลุ่ม · โหมดตามวัน = ลำดับหัวกลุ่ม */
function groupRows(rows: IssueRow[], mode: 'date' | 'person', dateAsc: boolean): IssueGroup[] {
  const m = new Map<string, IssueGroup>()
  for (const r of rows) {
    const k = mode === 'date' ? r.date : r.emp
    let g = m.get(k)
    if (!g) { g = { key: k, rows: [], late: 0, early: 0 }; m.set(k, g) }
    g.rows.push(r)
    if (r.late_min > 0) g.late++
    if (r.early_min > 0) g.early++
  }
  const out = [...m.values()]
  for (const g of out) {
    g.rows.sort((a, b) => (mode === 'date'
      ? a.name.localeCompare(b.name, 'th') || a.seq - b.seq
      // เรียงตามคน = ไล่วันตามที่เลือก (ตั้งต้นเก่า -> ใหม่ อ่านเป็นไทม์ไลน์ของคนนั้นได้)
      : (dateAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.seq - b.seq))
  }
  return mode === 'date'
    ? out.sort((a, b) => (dateAsc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)))
    : out.sort((a, b) => (b.rows.length - a.rows.length) || a.rows[0].name.localeCompare(b.rows[0].name, 'th'))
}

/** โชว์ทีละ 10 คน — backend บางตัว (และ mock) ไม่สนใจ limit/offset ที่ส่งไป
    ถ้ามาเกินหน้าละ 10 ก็ตัดเองฝั่งหน้าเว็บ ไม่งั้นรายชื่อยาวทั้งหน้า */
const pageSlice = (rows: IssueRow[], page: number) =>
  (rows.length > PAGE_SIZE ? rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : rows)

/** เวอร์ชันทั่วไปของ pageSlice — ใช้กับ "กลุ่ม" ตอนอยู่โหมดจัดกลุ่ม */
const pageSliceOf = <T,>(items: T[], page: number) =>
  (items.length > PAGE_SIZE ? items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : items)

/** โครงร่างระหว่างโหลด — การ์ดสูงเท่าของจริง รายการจึงไม่กระโดดตอนเปลี่ยนหน้า */
function IssueSkeleton({ count }: { count: number }) {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดรายชื่อ" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-2) var(--sp-3)',
          border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
        }}>
          <span className="skel" style={{ width: 40, height: 40, borderRadius: 'var(--r-full)', flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="skel" style={{ width: '45%', height: 14 }} />
            <span className="skel" style={{ width: '30%', height: 12 }} />
          </div>
          {[0, 1, 2, 3].map((c) => (
            <div key={c} style={{ minWidth: 108, flex: 'none', padding: 'var(--sp-1) var(--sp-3)', borderLeft: '1px solid var(--control-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="skel" style={{ width: 48, height: 12 }} />
              <span className="skel" style={{ width: 70, height: 18 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function IssueList({ rows: allRows, total, page, onPage, showDate, loading, empty, groupBy, dateAsc = true }: {
  rows: IssueRow[]
  total: number
  page: number
  onPage: (p: number) => void
  showDate: boolean
  loading: boolean
  empty: string
  /** กรองหลายวัน = จัดกลุ่มตามวัน/ตามคน (null = รายการเรียบแบบเดิม ใช้ตอนดูวันเดียว) */
  groupBy?: 'date' | 'person' | null
  /** ลำดับวัน — true = เก่า -> ใหม่ (ค่าเริ่มต้น) */
  dateAsc?: boolean
}) {
  // จัดกลุ่มอยู่ = แบ่งหน้าทีละ 10 "กลุ่ม" ไม่ใช่ 10 แถว (ไม่งั้นกลุ่มโดนหั่นครึ่งคาหน้า)
  const groups = groupBy ? groupRows(allRows, groupBy, dateAsc) : null
  const pageGroups = groups ? pageSliceOf(groups, page) : null
  const rows = pageSlice(allRows, page)
  const boxRef = useRef<HTMLDivElement>(null)

  // เปลี่ยนหน้าแล้วเลื่อนกลับไปแถวแรก — ไม่งั้นกดหน้าถัดไปทั้งที่มองอยู่ท้ายรายการ แล้วงงว่าอยู่ตรงไหน
  const goPage = (p: number) => {
    onPage(p)
    const el = boxRef.current
    const main = el?.closest('main')
    if (!el || !main) return
    // หยุดใต้ Topbar กระจก (80) เผื่อระยะหายใจอีก 16
    main.scrollTo({ top: main.scrollTop + el.getBoundingClientRect().top - (TOPBAR + 16), behavior: 'smooth' })
  }

  return (
    <div ref={boxRef} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {loading
        // โหลดอยู่ (รวมตอนกดเปลี่ยนหน้า) = โชว์ skeleton เท่าจำนวนแถวเดิม ไม่ค้างข้อมูลหน้าก่อน
        ? <IssueSkeleton count={Math.max(1, rows.length || Math.min(PAGE_SIZE, total || PAGE_SIZE))} />
        : allRows.length === 0
          ? <div style={{ ...TEXT.body, padding: '48px 20px', color: 'var(--ok)', textAlign: 'center' }}>{empty}</div>
          : pageGroups
            ? pageGroups.map((g) => <GroupCard key={g.key} g={g} mode={groupBy!} />)
            : rows.map((r, i) => (
              <IssueItem key={`${r.emp}:${r.date}:${i}`} r={r} showDate={showDate} />
            ))}
      {/* จัดกลุ่มอยู่ = นับหน้าเป็นจำนวนกลุ่ม (วัน/คน) ไม่ใช่จำนวนแถว */}
      {groups
        ? groups.length > PAGE_SIZE && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={groups.length} shown={pageGroups!.length} onPage={goPage}
            unit={groupBy === 'date' ? 'วัน' : 'คน'} />
        )
        : total > PAGE_SIZE && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} shown={rows.length} onPage={goPage} />
        )}
    </div>
  )
}

export function ReportLate() {
  const { currentHcode } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  const [from, setFrom] = useState(localISO())
  const [to, setTo] = useState(localISO())
  const [search, setSearch] = useState('')
  // เวร/แผนก เลือกได้หลายอัน
  const [fShifts, setFShifts] = useState<string[]>([])
  const [fDepts, setFDepts] = useState<string[]>([])
  // ค่าเริ่มต้นเห็นรวมทุกคนที่มีปัญหา (สายหรือออกก่อน) — ชิปเป็นตัวกรอง กดเพื่อเหลือฝั่งเดียว กดซ้ำกลับมารวม
  const [view, setView] = useState<'all' | 'late' | 'early'>('all')
  // กรองหลายวัน = จัดกลุ่มรายการ ("เรียงตามวัน" ตั้งต้น) — ก่อนหน้านี้แถวของคนเดียวกันกระจายอยู่คนละใบ ไล่ดูยาก
  const [groupBy, setGroupBy] = useState<'date' | 'person'>('date')
  // ลำดับวัน — ตั้งต้นเก่า -> ใหม่ กดปุ่มไอคอนสลับได้
  const [dateAsc, setDateAsc] = useState(true)
  const [latePage, setLatePage] = useState(0)
  const [earlyPage, setEarlyPage] = useState(0)
  const [allPage, setAllPage] = useState(0)
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)

  // ค้นชื่อ/รหัส/แผนก — หน่วง 300ms แล้วกรองจากข้อมูลที่โหลดมา (backend ยังไม่มี q ให้ endpoint นี้)
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(search.trim().toLowerCase()), 300); return () => clearTimeout(t) }, [search])

  // สลับโรง = ล้างตัวกรอง + กลับมาดูวันนี้ · เปลี่ยนเงื่อนไข = กลับหน้าแรกทั้งสองแผง
  useEffect(() => { setFShifts([]); setFDepts([]); setSearch(''); setFrom(localISO()); setTo(localISO()) }, [hcode])
  useEffect(() => { setLatePage(0); setEarlyPage(0); setAllPage(0) }, [from, to, fShifts, fDepts, dq, hcode, groupBy, dateAsc])

  const fq = filterQS(fShifts, fDepts)
  // ช่วงหลายวัน = ต้องจัดกลุ่มข้ามหน้า (คนคนเดียวโผล่หลายวัน) จึงดึงมาทีเดียวแล้วแบ่งหน้าเองฝั่งหน้าเว็บ
  // วันเดียว = แบ่งหน้าที่ backend เหมือนเดิม (รายการยาวได้ ไม่ต้องขนมาทั้งก้อน)
  const bulk = from !== to
  const anaF = useFetch<Analytics>(hcode
    ? `/admin/attendance/analytics?hcode=${encodeURIComponent(hcode)}&date_from=${from}&date_to=${to}${fq}`
      + (bulk
        ? '&limit=1000&late_offset=0&early_offset=0'
        : `&limit=${PAGE_SIZE}&late_offset=${latePage * PAGE_SIZE}&early_offset=${earlyPage * PAGE_SIZE}`)
    : null, reload)

  // รวมเป็นแถวหน้าตาเดียวกันทั้งสองมุมมอง — backend เก่าไม่ส่ง late_min/early_min ของอีกฝั่ง ก็ถอยไปใช้ min ของฝั่งตัวเอง
  const toRow = (r: SideRow, side: 'late' | 'early'): IssueRow => ({
    emp: r.emp, name: r.name, dept: r.dept, date: r.date, shift: r.shift, seq: r.seq ?? 1,
    in: r.in ?? '', out: r.out ?? '',
    late_min: r.late_min ?? (side === 'late' ? r.min : 0),
    early_min: r.early_min ?? (side === 'early' ? r.min : 0),
  })
  const lateRows = useMemo<IssueRow[]>(
    () => (anaF.data?.late_rows ?? []).map((r) => toRow(r, 'late')),
    [anaF.data])
  const earlyRows = useMemo<IssueRow[]>(
    () => (anaF.data?.early_rows ?? []).map((r) => toRow(r, 'early')),
    [anaF.data])

  // มุมมองรวม — คนเดียวกันวันเดียวกันโผล่ทั้งสองฝั่งได้ (สายด้วยออกก่อนด้วย) ต้องยุบเป็นแถวเดียว
  const allRows = useMemo<IssueRow[]>(() => {
    const seen = new Map<string, IssueRow>()
    for (const r of [...lateRows, ...earlyRows]) {
      const k = `${r.emp}:${r.date}:${r.seq}`
      const cur = seen.get(k)
      if (!cur) seen.set(k, { ...r })
      else {
        // เติมข้อมูลฝั่งที่อีกแถวมี (backend เก่าส่งมาไม่ครบสองฝั่ง)
        cur.in = cur.in || r.in
        cur.out = cur.out || r.out
        cur.late_min = Math.max(cur.late_min, r.late_min)
        cur.early_min = Math.max(cur.early_min, r.early_min)
      }
    }
    return [...seen.values()]
  }, [lateRows, earlyRows])

  const match = (r: IssueRow) => !dq
    || r.name.toLowerCase().includes(dq) || r.emp.toLowerCase().includes(dq) || (r.dept ?? '').toLowerCase().includes(dq)
  const lateShown = dq ? lateRows.filter(match) : lateRows
  const earlyShown = dq ? earlyRows.filter(match) : earlyRows
  const allShown = dq ? allRows.filter(match) : allRows

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) {
    return <div className="max-w-(--page-max) text-body text-text-dim">ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div>
  }

  const multiDay = from !== to
  const ready = !!anaF.data
  // ป้ายมุมขวาหัวแผง — บอกทุกตัวกรองที่ใช้อยู่ ไม่ใช่แค่ช่วงวัน
  const shiftLabel = selLabel(shiftOpts, fShifts, 'ทุกเวร', 'เวร')
  const deptLabel = selLabel(deptOpts, fDepts, 'ทุกแผนก', 'แผนก')
  const rangeMeta = [
    multiDay ? `${thShort(from)} – ${thShort(to)}` : thShort(to),
    shiftLabel,
    deptLabel,
  ].join(' · ')

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <PageHeader
        title="รายงานสถิติการเข้า - ออกงาน"
        desc="ติดตามพนักงานที่มาสายหรือออกก่อนเวลาที่กำหนด"
        art={<>
        {/* ภาพประกอบ (Figma node 114:33516) — ยึดขวา ส่วนที่เกินถูก crop ตามดีไซน์ */}
        <img src={asset("/hero-late.svg")} alt="" aria-hidden width={356} height={232}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 0, bottom: 0 }} />
        </>}
        actions={<>
          {/* Figma หน้านี้ไม่มีปุ่มรีเฟรช แต่หน้ารายงานอื่นมีทุกหน้า — คงไว้ให้ใช้งานเหมือนกัน */}
          <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={anaF.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรช
          </Button>
        </>}
      >

        {/* การ์ดสรุป 2 ใบ (Figma: ไอคอนซ้าย ข้อความขวา) */}
        <div className="relative mt-4 flex gap-4 flex-wrap stat-grid">
          <StatCard tone="warn" layout="row" label="มาสาย" unit={multiDay ? 'ครั้ง' : 'คน'}
            icon={<Icon name="clock-alert" size={24} color="currentColor" />}
            value={ready ? nf(anaF.data!.late_total) : anaF.loading ? '…' : '—'} />
          <StatCard tone="info" layout="row" label="ออกก่อนเวลา" unit={multiDay ? 'ครั้ง' : 'คน'}
            icon={<Icon name="time-duration-off" size={24} color="currentColor" />}
            value={ready ? nf(anaF.data!.early_total) : anaF.loading ? '…' : '—'} />
        </div>

        {/* แถบเกณฑ์ */}
        <div className="relative mt-4 rounded-lg text-body" style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--accent-light)', color: 'var(--text-dim)',
        }}>
          <Icon name="info" size={20} width={1.8} color="var(--accent)" />
          เกณฑ์: สาย = ลงเวลาเข้าหลังเวลาเริ่มเวร · ออกก่อน = ลงเวลาออกก่อนเวลาเลิกเวร
        </div>
      </PageHeader>

      {anaF.err && <ErrorBox>ผิดพลาด: {anaF.err}</ErrorBox>}

      {/* ---------- ค้นหา + ตัวกรอง (แถวเดียวกัน เหนือแผงรายชื่อ) ---------- */}
      <FilterBar activeCount={(fShifts.length > 0 ? 1 : 0) + (fDepts.length > 0 ? 1 : 0)}
        search={<SearchInput grow value={search} onChange={setSearch} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน / แผนก" />}>
        <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
          {/* backend รับช่วงยาวสุด 31 วัน — ล็อกขอบให้เลือกเกินไม่ได้ */}
          <DateRangePicker bare from={from} to={to} max={localISO()}
            onFrom={(v) => setFrom(v < isoAddDays(to, -30) ? isoAddDays(to, -30) : v)}
            onTo={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
        </FilterChip>
        <FilterChip icon={<Icon name="calendar-time" size={24} width={1.8} />} label="เลือกเวร">
          <SearchSelect bare hideCaret multi values={fShifts} onToggle={(v) => setFShifts(toggle(fShifts, v))} onClear={() => setFShifts([])} clearLabel="เลือกทุกเวร"
            options={shiftOpts}
            placeholder="ทั้งหมด" searchPlaceholder="ค้นเวร…" maxTriggerWidth={120} />
        </FilterChip>
        <FilterChip icon={<Icon name="briefcase" size={24} width={1.8} />} label="เลือกแผนก">
          <SearchSelect bare hideCaret multi values={fDepts} onToggle={(v) => setFDepts(toggle(fDepts, v))} onClear={() => setFDepts([])} clearLabel="เลือกทุกแผนก"
            options={deptOpts}
            placeholder="ทั้งหมด" searchPlaceholder="ค้นแผนก…" maxTriggerWidth={120} />
        </FilterChip>
      </FilterBar>

      {/* ---------- แผงรายชื่อใบเดียว — เริ่มที่รวมทุกคน · ชิปกรองเหลือฝั่งเดียว (กดซ้ำ = กลับมารวม) ---------- */}
      <SectionPanel
        title={view === 'late' ? 'พนักงานที่มาสาย' : view === 'early' ? 'พนักงานที่ออกก่อนเวลา' : 'พนักงานที่มาสายหรือออกก่อนเวลา'}
        meta={rangeMeta}
        filters={<>
          <FilterChip outlined variant="choice" tone="warn" active={view === 'late'}
            onClick={() => setView(view === 'late' ? 'all' : 'late')}
            icon={<Icon name="clock-alert" size={16} width={2} />} label="มาสาย" />
          <FilterChip outlined variant="choice" tone="accent" active={view === 'early'}
            onClick={() => setView(view === 'early' ? 'all' : 'early')}
            icon={<Icon name="time-duration-off" size={16} width={2} />} label="ออกก่อนเวลา" />
          {/* ช่วงหลายวันเท่านั้น — วันเดียวจัดกลุ่มแล้วได้กลุ่มเดียว ไม่มีประโยชน์ */}
          {multiDay && (
            <>
              <span aria-hidden style={{ width: 1, alignSelf: 'stretch', background: 'var(--control-border)', margin: '0 var(--sp-1)' }} />
              <FilterChip outlined variant="choice" tone="accent" active={groupBy === 'date'} onClick={() => setGroupBy('date')}
                icon={<Icon name="calendar" size={16} width={2} />} label="เรียงตามวัน" />
              <FilterChip outlined variant="choice" tone="accent" active={groupBy === 'person'} onClick={() => setGroupBy('person')}
                icon={<Icon name="person" size={16} width={2} />} label="เรียงตามคน" />
              {/* สลับลำดับวัน — ตามคน = ลำดับแถวในกลุ่ม · ตามวัน = ลำดับหัวกลุ่ม */}
              <FilterChip outlined variant="action" tone="accent" iconOnly onClick={() => setDateAsc((v) => !v)}
                icon={<Icon name={dateAsc ? 'sort-asc' : 'sort-desc'} size={16} width={2} />}
                label={dateAsc ? 'ลำดับวัน: เก่า → ใหม่ (กดเพื่อสลับ)' : 'ลำดับวัน: ใหม่ → เก่า (กดเพื่อสลับ)'} />
            </>
          )}
        </>}
      >
        {/* ตัวกรองเลือกแค่ว่า "เห็นใคร" — คอลัมน์แสดงครบทั้งเข้า/สาย/ออก/ออกก่อนเหมือนกันทุกมุมมอง */}
        {view === 'late'
          ? (
            <IssueList rows={lateShown} total={dq || multiDay ? lateShown.length : (anaF.data?.late_total ?? lateShown.length)}
              page={latePage} onPage={setLatePage} showDate={multiDay} groupBy={multiDay ? groupBy : null} dateAsc={dateAsc}
              loading={anaF.loading} empty={dq ? 'ไม่พบพนักงานที่ตรงกับที่ค้นหา' : 'ไม่มีคนมาสายในช่วงที่เลือก'} />
          )
          : view === 'early'
            ? (
              <IssueList rows={earlyShown} total={dq || multiDay ? earlyShown.length : (anaF.data?.early_total ?? earlyShown.length)}
                page={earlyPage} onPage={setEarlyPage} showDate={multiDay} groupBy={multiDay ? groupBy : null} dateAsc={dateAsc}
                loading={anaF.loading} empty={dq ? 'ไม่พบพนักงานที่ตรงกับที่ค้นหา' : 'ไม่มีคนออกก่อนเวลาในช่วงที่เลือก'} />
            )
            : (
              /* รวมสองฝั่งแล้วยุบคนซ้ำ — จำนวนหน้าคิดจากรายการที่รวมแล้ว */
              <IssueList rows={allShown} total={allShown.length}
                page={allPage} onPage={setAllPage} showDate={multiDay} groupBy={multiDay ? groupBy : null} dateAsc={dateAsc}
                loading={anaF.loading} empty={dq ? 'ไม่พบพนักงานที่ตรงกับที่ค้นหา' : 'ไม่มีคนมาสายหรือออกก่อนเวลาในช่วงที่เลือก'} />
            )}
      </SectionPanel>
    </div>
  )
}
