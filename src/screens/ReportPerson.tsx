import { useEffect, useMemo, useRef, useState } from 'react'
import { clock, nf, useFetch, useServerPage } from '../hooks'
import { daysAgoISO, localISO, useAttFilterOptions } from '../components/AttFilters'
import { MonthRangePicker, TH_M, thShort } from '../components/DatePicker'
import { GroupedBars, GroupedBarsSkeleton } from '../components/charts'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { Loading } from '../components/Spinner'
import { PAGE_SIZE, usePaged } from '../components/Pager'
import { PickHospital } from '../components/PickHospital'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterChip } from '../components/inputs/FilterChip'
import { Avatar } from '../components/data-display/Avatar'
import { StatCard } from '../components/data-display/StatCard'
import { ShiftBadge, shiftKindOf } from '../components/data-display/ShiftBadge'
import { StatusBadge } from '../components/data-display/StatusBadge'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'

// รายบุคคล — Figma node 66:16084 (รายชื่อ) + 66:20837 (รายละเอียดรายคน)
//   list   : การ์ดหัวเรื่อง + การ์ดจำนวนพนักงาน + ค้นหา/กรองแผนก + ตารางพร้อมสถานะวันนี้
//   detail : ปุ่มย้อนกลับ + การ์ดโปรไฟล์ + การ์ดสรุป 4 ใบ + ประวัติเข้า-ออกงาน
//
// ⚠️ Figma ไม่มีภาพประกอบให้ export เป็นไฟล์เดียว (เป็นกลุ่ม vector) — หน้านี้จึงยังไม่มีภาพ

type Emp = { emp: string; name: string; dept: string; position: string; phone: string; email?: string; start_date: string; emp_type: string }
type EmpList = { count: number; total: number; rows: Emp[] }
type HistRow = { date: string; seq?: number; in: string; out: string; shift: string; late: boolean; early: boolean; late_min: number; early_min: number; no_out: boolean }
type EmpHist = {
  emp_id: string; name: string; days: number
  stat: { present: number; late: number; early: number; no_out: number; out_area: number }
  rows: HistRow[]
}
/** แถวลงเวลาของ "วันนี้" ที่เอามา join กับรายชื่อ (Figma มีคอลัมน์ เวลาเข้า-ออก + สถานะ) */
type TodayRow = { emp: string; in: string; out: string; late: boolean; early: boolean; no_out: boolean }

// ค่าว่าง: แผนก = "ไม่ระบุแผนก" / อื่นๆ = "—"
const deptTxt = (d: string) => (d ? d : 'ไม่ระบุแผนก')
const blank = (v: string) => (v && v.trim() ? v : '—')

/** วันที่ในตารางประวัติ — Figma ใช้ dd/mm/พ.ศ. เต็ม เช่น 10/07/2567 */
function thDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${Number(m[1]) + 543}` : (iso || '—')
}

// วันที่เริ่มงาน: ISO -> ไทยสั้น / format อื่นโชว์ตามที่ได้มา
function startTxt(s: string): string {
  if (!s || !s.trim()) return '—'
  const t = thShort(s)
  return t === '—' ? s : t
}

// รวมชั่วโมงจาก in-out — out มี " (+1)" = ออกเช้าวันถัดไป (+24 ชม.)
function parseHM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(s.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
function totalHours(tin: string, tout: string): string {
  const a = parseHM(tin)
  const plus1 = tout.includes('(+1)')
  const b = parseHM(tout.replace('(+1)', '').trim())
  if (a == null || b == null) return '—'
  const mins = b + (plus1 ? 1440 : 0) - a
  if (mins < 0) return '—'
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

/** ป้ายสถานะของแถว 1 วัน — ใช้ StatusBadge ของ design system (ซ้อนกันได้ เช่น สาย + ออกก่อน) */
function DayStatus({ r }: { r: { late: boolean; early: boolean; no_out: boolean; late_min?: number; early_min?: number } }) {
  const on = [
    r.late && <StatusBadge key="late" status="late" label={r.late_min ? `มาสาย ${nf(r.late_min)} นาที` : 'มาสาย'} />,
    r.early && <StatusBadge key="early" status="early" label={r.early_min ? `ออกก่อน ${nf(r.early_min)} นาที` : 'ออกก่อนเวลา'} />,
    r.no_out && <StatusBadge key="noout" status="leave" label="ลืมลงเวลาออก" />,
  ].filter(Boolean)
  if (on.length === 0) return <StatusBadge status="ontime" />
  return <span style={{ display: 'inline-flex', gap: 'var(--sp-1)', flexWrap: 'wrap' }}>{on}</span>
}

/** ข้อมูล 1 ช่องในการ์ดโปรไฟล์ (ป้ายกำกับเล็ก + ค่าตัวหนา) */
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ ...TEXT.bodyMed, color: 'var(--text)', fontFamily: mono ? 'var(--mono)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

/** ป้ายติดต่อ (อีเมล/เบอร์โทร) — Figma: พื้น surface-blue · r-xl · padding 4/12 · ไอคอน 14 + ข้อความ 12 สี accent */
function ContactPill({ icon, text }: { icon: string; text: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
      padding: 'var(--sp-1) var(--sp-3)',
      borderRadius: 'var(--r-xl)', background: 'var(--surface-blue)',
      ...TEXT.sm, color: 'var(--accent)', whiteSpace: 'nowrap',
    }}>
      <span aria-hidden style={{
        width: 26, height: 26, flex: 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={14} width={1.8} />
      </span>
      {text}
    </span>
  )
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** "YYYY-MM" บวก/ลบเดือน */
function addMonth(ym: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  const now = new Date()
  const d = new Date(m ? Number(m[1]) : now.getFullYear(), (m ? Number(m[2]) - 1 : now.getMonth()) + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** จำนวนเดือนในช่วง (รวมหัวท้าย) */
function monthCount(from: string, to: string): number {
  const a = /^(\d{4})-(\d{2})$/.exec(from), b = /^(\d{4})-(\d{2})$/.exec(to)
  if (!a || !b) return 1
  return (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2])) + 1
}
/** ช่วงวันของกราฟ: วันแรกของเดือนเริ่ม -> วันสุดท้ายของเดือนจบ (ไม่เลยวันนี้) */
function monthRange(fromM: string, toM: string): { from: string; to: string } {
  const a = /^(\d{4})-(\d{2})$/.exec(fromM)
  const b = /^(\d{4})-(\d{2})$/.exec(toM)
  const now = new Date()
  const ay = a ? Number(a[1]) : now.getFullYear(), am = a ? Number(a[2]) - 1 : now.getMonth()
  const by = b ? Number(b[1]) : now.getFullYear(), bm = b ? Number(b[2]) - 1 : now.getMonth()
  const end = isoOf(new Date(by, bm + 1, 0))
  const today = localISO()
  return { from: isoOf(new Date(ay, am, 1)), to: end > today ? today : end }
}

// ความสูงพื้นที่กราฟ — ใช้ร่วมกับ skeleton ให้การ์ดสูงเท่ากันทุกสถานะ
const CHART_H = 320

// Topbar เป็นแถบกระจกลอยทับ (App.tsx) — ของที่ sticky ต้องหยุดใต้มัน
const TOPBAR = 80
const COMPACT_H = 60

// สีของ 4 ชุดข้อมูลตรงกับการ์ดสรุปด้านบน (Figma ใช้ชุดเดียวกัน)
const CHART_SERIES = [
  { key: 'present', label: 'มาทำงาน', color: 'var(--ok)' },
  { key: 'late', label: 'มาสาย', color: 'var(--warn)' },
  { key: 'absent', label: 'ขาดงาน', color: 'var(--danger)' },
  { key: 'early', label: 'ออกก่อน', color: 'var(--info)' },
]

export function ReportPerson() {
  const { currentHcode } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [sel, setSel] = useState<Emp | null>(null)
  // ช่วงวันของ detail (default 30 วันล่าสุด)
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(localISO())
  // ชิปช่วงเวลาที่เลือกอยู่ — null = ช่วงกำหนดเอง (กดชิปเดิมซ้ำเพื่อยกเลิกได้)
  const [preset, setPreset] = useState<'week' | 'month' | null>('month')
  // กราฟสถิติ: ช่วงเดือน (เลือกเองได้ว่าเดือนไหนถึงเดือนไหน) ตั้งต้น = เดือนนี้เดือนเดียว
  const [cFrom, setCFrom] = useState(localISO().slice(0, 7))
  const [cTo, setCTo] = useState(localISO().slice(0, 7))
  // แถบโปรไฟล์ย่อ: โผล่เมื่อการ์ดโปรไฟล์ใบใหญ่เลื่อนพ้นจอ
  const heroRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => { setSel(null); setSearch(''); setDept('') }, [hcode])

  const q = `hcode=${encodeURIComponent(hcode)}`
  // ค้นหาชื่อ/รหัส — หน่วง 300ms แล้วส่ง backend (แบ่งหน้า+ค้นข้ามทุกหน้าฝั่งเซิร์ฟเวอร์)
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(search.trim()), 300); return () => clearTimeout(t) }, [search])
  // list โหลดทีละหน้า — กดกลับจาก detail หน้าเดิมยังอยู่
  const listF = useServerPage<EmpList>(hcode ? `/admin/employees?${q}${dq ? `&q=${encodeURIComponent(dq)}` : ''}` : null, reload)
  // การลงเวลา "วันนี้" ของทั้งโรง — เอามา join เป็นคอลัมน์ เวลาเข้า-ออก/สถานะ ตาม Figma
  const today = localISO()
  const todayF = useFetch<{ rows: (TodayRow & { late_min: number; early_min: number })[] }>(
    hcode && !sel ? `/admin/attendance/daily?${q}&date_from=${today}&date_to=${today}&limit=500&offset=0` : null, reload)
  const todayBy = useMemo(() => {
    const m = new Map<string, TodayRow & { late_min: number; early_min: number }>()
    for (const r of todayF.data?.rows ?? []) if (!m.has(r.emp)) m.set(r.emp, r)
    return m
  }, [todayF.data])

  const { deptOpts } = useAttFilterOptions(hcode)

  const histF = useFetch<EmpHist>(
    hcode && sel ? `/admin/attendance/employee?${q}&emp_id=${encodeURIComponent(sel.emp)}&date_from=${from}&date_to=${to}` : null,
    reload,
  )
  const histPaged = usePaged(histF.data?.rows ?? [])

  // ---------- กราฟสถิติรายสัปดาห์ (Figma node 95:25768) — ช่วงวันของตัวเอง แยกจากตารางประวัติ ----------
  const cRange = useMemo(() => monthRange(cFrom, cTo), [cFrom, cTo])
  const chartF = useFetch<EmpHist>(
    hcode && sel ? `/admin/attendance/employee?${q}&emp_id=${encodeURIComponent(sel.emp)}&date_from=${cRange.from}&date_to=${cRange.to}` : null,
    reload,
  )
  // ช่วงยาว = รวมแท่งเป็นรายเดือน (ใช้ทั้งตอนจัดกลุ่มและตอนบอกผู้ใช้ว่ากราฟรวมแบบไหน)
  const chartByMonth = useMemo(() => {
    const days = Math.floor((new Date(`${cRange.to}T00:00:00`).getTime() - new Date(`${cRange.from}T00:00:00`).getTime()) / 86400000) + 1
    return monthCount(cFrom, cTo) > 1 || days > 35
  }, [cRange, cFrom, cTo])

  const chartGroups = useMemo(() => {
    // ช่วงยาว (เกิน 1 เดือน หรือเกิน 5 สัปดาห์) -> แท่งละ 1 เดือน ไม่งั้นแท่งเยอะจนอ่านไม่ออก
    // ช่วงสั้น -> แท่งละ 7 วันนับจากวันแรกของช่วง ("1 สัปดาห์", "2 สัปดาห์", ...)
    const byDate = new Map<string, HistRow>()
    for (const r of chartF.data?.rows ?? []) if (!byDate.has(r.date)) byDate.set(r.date, r)
    const start = new Date(`${cRange.from}T00:00:00`)
    const end = new Date(`${cRange.to}T00:00:00`)
    const today = localISO()
    const byMonth = chartByMonth

    const groups: { label: string; values: Record<string, number> }[] = []
    const keyed = new Map<string, number>()   // คีย์กลุ่ม -> ตำแหน่งใน groups
    const bucket = (label: string, key: string) => {
      let i = keyed.get(key)
      if (i == null) {
        i = groups.length
        keyed.set(key, i)
        groups.push({ label, values: { present: 0, late: 0, absent: 0, early: 0 } })
      }
      return groups[i].values
    }

    const d = new Date(start)
    for (let i = 0; d <= end && i < 400; i++, d.setDate(d.getDate() + 1)) {
      const v = byMonth
        ? bucket(`${TH_M[d.getMonth()]} ${(d.getFullYear() + 543) % 100}`, `${d.getFullYear()}-${d.getMonth()}`)
        : bucket(`${Math.floor(i / 7) + 1} สัปดาห์`, `w${Math.floor(i / 7)}`)
      const iso = isoOf(d)
      const row = byDate.get(iso)
      if (row) {
        v.present++
        if (row.late) v.late++
        if (row.early) v.early++
      } else if (d.getDay() >= 1 && d.getDay() <= 5 && iso <= today) {
        // ขาดงาน = วันทำการที่ผ่านมาแล้วแต่ไม่มีการลงเวลา (ระบบยังไม่มีข้อมูลวันลา)
        v.absent++
      }
    }
    return groups
  }, [chartF.data, cRange, chartByMonth])

  // ---------- แถบโปรไฟล์ย่อแบบติดบน ----------
  // การ์ดโปรไฟล์ใบใหญ่เลื่อนพ้นใต้ header เมื่อไหร่ -> โชว์แถบย่อแทน (ยังรู้ว่าดูของใครอยู่)
  useEffect(() => {
    const el = heroRef.current
    if (!el) { setCompact(false); return }
    const io = new IntersectionObserver(
      ([e]) => setCompact(!e.isIntersecting),
      { root: el.closest('main'), rootMargin: `-${TOPBAR + 8}px 0px 0px 0px`, threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sel])

  if (currentHcode === '*') return <PickHospital />

  const openDetail = (p: Emp) => {
    setFrom(daysAgoISO(29))
    setTo(localISO())
    setPreset('month')
    setSel(p)
  }

  // server ทำ q + แบ่งหน้าให้แล้ว — ตัวกรองแผนกทำบนหน้าที่โหลดมา (backend ยังไม่มี query แผนก)
  const rows = listF.data?.rows ?? []
  const shown = dept ? rows.filter((p) => p.dept === dept) : rows

  // ---------- โหมด list ----------
  if (!sel) {
    const listCols: Column<Emp>[] = [
      { key: 'avatar', header: 'รูป', width: 72, thStyle: { padding: '12px 16px' }, tdStyle: { padding: '12px 16px' }, cell: (p) => <Avatar name={p.name} seed={p.emp} /> },
      { key: 'name', header: 'ชื่อ-นามสกุล', width: 240, tdStyle: { ...TEXT.bodyMed }, cell: (p) => blank(p.name) },
      { key: 'emp', header: 'รหัสพนักงาน', width: 140, tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-dim)' }, cell: (p) => blank(p.emp) },
      { key: 'dept', header: 'แผนก', width: 180, tdStyle: { color: 'var(--text-dim)' }, cell: (p) => deptTxt(p.dept) },
      {
        key: 'io', header: 'เวลาเข้า-ออก', width: 180, tdStyle: { color: 'var(--text-dim)' }, cell: (p) => {
          const t = todayBy.get(p.emp)
          if (!t) return <span style={{ color: 'var(--text-faint)' }}>- -</span>
          return `${clock(t.in)} - ${clock(t.out)}`
        },
      },
      {
        key: 'status', header: 'สถานะ', cell: (p) => {
          const t = todayBy.get(p.emp)
          if (!t) return <StatusBadge status="leave" label="ไม่มีข้อมูล" />
          return <DayStatus r={t} />
        },
      },
      {
        key: 'go', header: '', align: 'right', width: 76, thStyle: { padding: '12px 16px' }, tdStyle: { padding: '12px 16px' }, cell: () => (
          <span aria-hidden title="ดูรายละเอียด" style={{
            width: 36, height: 36, borderRadius: 'var(--r-full)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-light)', color: 'var(--accent-active)',
          }}>
            <Icon name="eye" size={18} width={1.8} />
          </span>
        ),
      },
    ]

    return (
      <div className="max-w-[var(--page-max)] flex flex-col gap-4">
        {/* ---------- การ์ดหัวเรื่อง ---------- */}
        <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
          {/* ภาพประกอบทีมพนักงาน (Figma node I66:18673;66:18975) — 309x297
              Figma วางที่ x 773 บนการ์ดกว้าง 1098 = ห่างขอบขวา 16 (ยึดขวาไว้ให้การ์ดยืดได้)
              การ์ดสูง 195 ส่วนที่เกินถูก crop ด้วย overflow-hidden ตามดีไซน์ */}
          <img src={asset("/hero-person.svg")} alt="" aria-hidden width={309} height={297}
            className="hide-sm pointer-events-none select-none"
            style={{ position: 'absolute', right: 16, top: 24 }} />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-h2 m-0 text-text">รายชื่อพนักงาน</h1>
              <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
                จัดการข้อมูลพนักงาน ตรวจสอบสถานะการลงเวลา และดูรายงานสรุปประจำวัน
              </p>
            </div>
            <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={listF.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรชข้อมูลล่าสุด
            </Button>
          </div>

          {/* Figma: การ์ดเดียว กว้าง 360 (ไอคอนซ้าย ข้อความขวา) */}
          <div className="relative mt-4 max-w-90">
            <StatCard tone="accent" label="พนักงาน" unit="คน" layout="row"
              icon={<Icon name="person" size={24} color="currentColor" />}
              value={listF.data ? nf(listF.data.count) : listF.loading ? '…' : '—'} />
          </div>
        </div>

        {/* ---------- ค้นหา + กรองแผนก ---------- */}
        <div className="flex items-center gap-2 flex-wrap">
          <SearchInput grow value={search} onChange={setSearch} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน" />
          <FilterChip icon={<Icon name="briefcase" size={24} width={1.8} />} label="เลือกแผนก">
            <SearchSelect bare hideCaret value={dept} onChange={setDept}
              options={[{ value: '', label: 'ทั้งหมด' }, ...deptOpts]}
              placeholder="ทั้งหมด" searchPlaceholder="ค้นแผนก…" maxTriggerWidth={120} />
          </FilterChip>
        </div>

        {/* ---------- ตาราง ---------- */}
        <div className="bg-bg border border-control-border rounded-lg">
          {listF.err
            ? <div className="text-body p-4 text-danger">ผิดพลาด: {listF.err}</div>
            : (
              <>
                <DataTable
                  columns={listCols}
                  rows={shown}
                  rowKey={(p) => p.emp}
                  onRowClick={(p) => openDetail(p)}
                  minWidth={980}
                  loading={listF.loading && !listF.data ? <Loading /> : undefined}
                  empty={dq || dept ? 'ไม่พบพนักงานที่ตรงกับที่เลือก' : 'ไม่มีข้อมูลพนักงาน'}
                  emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }}
                />
                {!dept && (
                  <Pagination page={listF.page} pageSize={PAGE_SIZE} total={listF.data?.total ?? 0}
                    shown={shown.length} onPage={listF.setPage} />
                )}
              </>
            )}
        </div>
      </div>
    )
  }

  // ---------- โหมด detail ----------
  const thisMonth = localISO().slice(0, 7)
  const s = histF.data?.stat
  const days = histF.data?.days
  // Figma: มาทำงาน (x จาก y วัน) · มาสาย · ขาดงาน · ออกก่อนเวลา
  const absent = days != null && s ? Math.max(0, days - s.present) : undefined
  const SUM = [
    { label: 'มาทำงาน', v: s?.present, unit: days != null ? `จาก ${nf(days)} วัน` : 'วัน', tone: 'ok' as const, icon: 'scan' },
    { label: 'มาสาย', v: s?.late, unit: 'วัน', tone: 'warn' as const, icon: 'clock-alert' },
    { label: 'ขาดงาน', v: absent, unit: 'วัน', tone: 'danger' as const, icon: 'clock-x' },
    { label: 'ออกก่อนเวลา', v: s?.early, unit: 'วัน', tone: 'info' as const, icon: 'time-duration-off' },
  ]

  // Figma: header สูง 44 · แถวสูง 65 · ชิดซ้ายทุกคอลัมน์ · เวร 66 · สถานะ 120 ที่เหลือเท่ากัน
  const histTd = { padding: 'var(--sp-5) var(--sp-6)' }
  const histCols: Column<HistRow>[] = [
    { key: 'date', header: 'วันที่', thStyle: { padding: 'var(--sp-3) var(--sp-6)' }, tdStyle: { ...histTd, fontFamily: 'var(--mono)', color: 'var(--table-row-text)', whiteSpace: 'nowrap' }, cell: (r) => thDate(r.date) },
    { key: 'shift', header: 'เวร', width: 110, tdStyle: { padding: 'var(--sp-3) var(--sp-2)' }, cell: (r) => (r.shift ? <ShiftBadge shift={shiftKindOf(r.shift)} /> : '—') },
    { key: 'in', header: 'เวลาเข้า', tdStyle: { ...histTd, color: 'var(--table-row-text)' }, cell: (r) => clock(r.in) },
    { key: 'out', header: 'เวลาออก', tdStyle: { ...histTd, color: 'var(--table-row-text)' }, cell: (r) => clock(r.out) },
    { key: 'total', header: 'รวมเวลา', tdStyle: { ...histTd, fontFamily: 'var(--mono)' }, cell: (r) => totalHours(r.in, r.out) },
    { key: 'status', header: 'สถานะ', width: 200, thStyle: { padding: 'var(--sp-3) var(--sp-6)' }, tdStyle: { padding: 'var(--sp-3) var(--sp-6)' }, cell: (r) => <DayStatus r={r} /> },
  ]

  /** ปุ่มลัดช่วงวัน (Figma: "ของสัปดาห์นี้" / "ของเดือนนี้")
      กดชิปที่เลือกอยู่ซ้ำ = ยกเลิกการเลือก (ช่วงวันคงเดิม ผู้ใช้ไปปรับเองต่อได้) */
  const togglePreset = (key: 'week' | 'month', days: number) => {
    if (preset === key) return setPreset(null)
    setPreset(key)
    setFrom(daysAgoISO(days - 1))
    setTo(localISO())
  }
  /** เลือกช่วงเองจากปฏิทิน = ไม่ใช่ preset ไหนแล้ว */
  const pickFrom = (v: string) => { setPreset(null); setFrom(v) }
  const pickTo = (v: string) => { setPreset(null); setTo(v) }

  return (
    <div className="max-w-[var(--page-max)] flex flex-col gap-4">
      {/* ---------- โปรไฟล์ย่อ ลอยกลางล่างจอ ----------
          fixed -> ไม่กินที่ในโฟลว์ เนื้อหาไม่กระโดดตอนแถบโผล่/หาย
          โผล่เมื่อการ์ดโปรไฟล์ใบใหญ่เลื่อนพ้นจอ (IntersectionObserver ด้านบน) */}
      <div className="float-bottom">
        <div aria-hidden={!compact} style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          height: COMPACT_H, padding: '0 var(--sp-4)',
          background: 'var(--bg)', border: '1px solid var(--control-border)',
          borderRadius: 'var(--r-full)', boxShadow: 'var(--shadow-lg)',
          opacity: compact ? 1 : 0,
          transform: compact ? 'none' : 'translateY(12px)',
          pointerEvents: compact ? 'auto' : 'none',
          transition: 'opacity .16s ease, transform .16s ease',
        }}>
          <Avatar name={sel.name} seed={sel.emp} size={36} />
          {/* ชื่อบน · ตำแหน่ง/แผนก ล่าง (รหัสพนักงานไม่ต้องโชว์ในโหมดย่อ) */}
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
            <span style={{ ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{blank(sel.name)}</span>
            <span style={{ ...TEXT.sm, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sel.position?.trim() ? sel.position : deptTxt(sel.dept)}
            </span>
          </span>
          {/* สรุปตัวเลขเดียวกับการ์ดใบใหญ่ ย่อเหลือตัวเลข + ป้าย */}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 'var(--sp-4)' }} className="hide-sm">
            {SUM.map((k) => (
              <span key={k.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--sp-1)', whiteSpace: 'nowrap' }}>
                <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{k.v != null ? nf(k.v) : '—'}</span>
                <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{k.label}</span>
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* ---------- การ์ดที่ 1 (Figma Frame 92) — พื้นไล่สีฟ้า ข้างในเป็นการ์ดขาวย่อย ----------
          ปุ่มย้อนกลับ · การ์ดโปรไฟล์ 672 · การ์ดสรุป 4 ใบ (173x84) ห่างกัน 16 */}
      <div ref={heroRef} className="relative overflow-hidden rounded-xl" style={{ padding: 'var(--sp-6)', background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <Button variant="outline-accent" size="xs" radius="lg" onClick={() => setSel(null)}
          icon={<Icon name="chevron-left" size={20} width={2} />}>
          ย้อนกลับ
        </Button>

        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div className="bg-bg rounded-xl" style={{ flex: '1 1 420px', minWidth: 'min(420px,100%)', display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start', padding: 'var(--sp-3) var(--sp-4)' }}>
            <Avatar name={sel.name} seed={sel.emp} size={80} />
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 'var(--sp-1)' }}>
              {/* ชื่อ + ป้ายติดต่อ อยู่บรรทัดเดียวกัน (ป้ายชิดขวา) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', minHeight: 34 }}>
                <span style={{ ...TEXT.h3, color: 'var(--text)' }}>{blank(sel.name)}</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {/* backend ที่ยังไม่ส่ง email/phone มา -> ป้ายนั้นหายไปเฉยๆ ไม่พัง */}
                  {sel.email && <ContactPill icon="mail" text={sel.email} />}
                  {sel.phone && <ContactPill icon="phone" text={sel.phone} />}
                </span>
              </div>

              {/* 3 คอลัมน์ × 2 แถว ตาม Figma (คอลัมน์ละ 184) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
                <Field label="รหัสพนักงาน" value={blank(sel.emp)} mono />
                <Field label="แผนก" value={deptTxt(sel.dept)} />
                <Field label="ตำแหน่ง" value={blank(sel.position)} />
                <Field label="ประเภทพนักงาน" value={blank(sel.emp_type)} />
                <Field label="วันที่เริ่มงาน" value={startTxt(sel.start_date)} />
              </div>
            </div>
          </div>

          {/* การ์ดสรุป 2x2 — Figma ใบละ 173x84 ไม่มีขอบ พื้นเดียวกับการ์ดแม่ */}
          <div className="grid gap-4 grid-cols-2" style={{ flex: '0 1 362px', minWidth: 'min(362px,100%)' }}>
            {SUM.map((k) => (
              <StatCard key={k.label} tone={k.tone} label={k.label} unit={k.unit} layout="row"
                icon={<Icon name={k.icon} size={24} color="currentColor" />}
                value={k.v != null ? nf(k.v) : histF.loading ? '…' : '—'} />
            ))}
          </div>
        </div>
      </div>

      {histF.err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {histF.err}</div>}

      {/* ---------- การ์ดที่ 2: ประวัติเข้า-ออกงาน (Figma Group 19) ---------- */}
      <SectionPanel
        title="ประวัติการเข้า-ออกงาน"
        filters={<>
          <FilterChip outlined variant="choice" tone="accent" active={preset === 'week'} onClick={() => togglePreset('week', 7)}
            icon={<Icon name="calendar-week" size={16} width={2} />} label="ของสัปดาห์นี้" />
          <FilterChip outlined variant="choice" tone="accent" active={preset === 'month'} onClick={() => togglePreset('month', 30)}
            icon={<Icon name="calendar-week" size={16} width={2} />} label="ของเดือนนี้" />
        </>}
        actions={
          <FilterChip outlined icon={<Icon name="calendar-week" size={16} width={2} />} label="เลือกช่วงวัน">
            <DateRangePicker bare from={from} to={to} onFrom={pickFrom} onTo={pickTo} max={localISO()} />
          </FilterChip>
        }
      >
        <div className="table-rounded rounded-lg" style={{ border: '1px solid var(--control-border)' }}>
          <DataTable
            columns={histCols}
            rows={histPaged.pageRows}
            rowKey={(r) => `${r.date}:${r.seq ?? 0}`}
            minWidth={820}
            loading={histF.loading && !histF.data ? <Loading text="กำลังโหลด… (ดึงทีละวัน อาจใช้เวลาครู่หนึ่ง)" /> : undefined}
            empty="ไม่มีการลงเวลาในช่วงนี้"
            emptyStyle={{ ...TEXT.body, padding: '28px 20px', color: 'var(--text-dim)', textAlign: 'center' }}
          />
          {histF.data && histF.data.rows.length > PAGE_SIZE && (
            <Pagination page={histPaged.page} pageSize={PAGE_SIZE} total={histPaged.total}
              shown={histPaged.pageRows.length} onPage={histPaged.setPage} />
          )}
        </div>
      </SectionPanel>

      {/* ---------- การ์ดที่ 3: กราฟสถิติรายสัปดาห์ (Figma Group 20) ---------- */}
      <SectionPanel
        title="สถิติการเข้า-ออกงานแยกตามสัปดาห์"
        filters={<>
          {([[1, 'ของเดือนนี้'], [3, '3 เดือนก่อน'], [6, '6 เดือนก่อน']] as const).map(([n, label]) => (
            /* เลือกเดือนอื่นเองแล้ว = ชิปไม่ตรงกับที่แสดงอยู่ จึงคลายไฮไลต์ */
            <FilterChip key={n} outlined variant="choice" tone="accent"
              active={cTo === thisMonth && cFrom === addMonth(thisMonth, -(n - 1))}
              onClick={() => { setCTo(thisMonth); setCFrom(addMonth(thisMonth, -(n - 1))) }}
              icon={<Icon name="calendar-week" size={16} width={2} />} label={label} />
          ))}
        </>}
        actions={
          <FilterChip outlined icon={<Icon name="calendar-week" size={16} width={2} />} label="เลือกช่วงเดือน">
            <MonthRangePicker bare from={cFrom} to={cTo} max={thisMonth}
              onChange={(a, b) => { setCFrom(a); setCTo(b) }} />
          </FilterChip>
        }
      >
        {/* สลับตัวกรอง = โหลดใหม่ทุกครั้ง -> โชว์ skeleton ที่สูงเท่ากราฟจริง การ์ดจะได้ไม่ยุบแล้วเด้ง */}
        {chartF.err
          ? <div className="text-body text-danger" style={{ height: CHART_H + 20, display: 'grid', placeItems: 'center' }}>ผิดพลาด: {chartF.err}</div>
          : chartF.loading
            ? <GroupedBarsSkeleton height={CHART_H} series={CHART_SERIES.length} unit="วัน" />
            : <GroupedBars groups={chartGroups} series={CHART_SERIES} height={CHART_H} unit="วัน" />}
      </SectionPanel>

      {/* เว้นท้ายหน้าให้สูงกว่าแคปซูลโปรไฟล์ลอย — ไม่งั้นมันบังแกน X ของกราฟใบล่างสุด */}
      <div aria-hidden style={{ height: COMPACT_H + 40, flex: 'none' }} />
    </div>
  )
}
