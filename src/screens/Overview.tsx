import { useEffect, useMemo, useState } from 'react'
import { clock, nf, useFetch } from '../hooks'
import { daysAgoISO, filterQS, isoAddDays, localISO, useAttFilterOptions } from '../components/AttFilters'
import { thShort } from '../components/DatePicker'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { Donut, SegmentBar, StackedColumns, TrendLine } from '../components/charts'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { Button } from '../components/inputs/Button'
import { FilterChip } from '../components/inputs/FilterChip'
import { Avatar } from '../components/data-display/Avatar'
import { StatCard } from '../components/data-display/StatCard'
import { StatusBadge } from '../components/data-display/StatusBadge'
import { shiftKindOf, type ShiftKind } from '../components/data-display/ShiftBadge'
import { PlatformPanels, PlatformStats, usePlatformOverview } from './PlatformOverview'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'

// หน้าหลัก — Figma node 13:2973
//   แท็บ ภาพรวม / การเข้า-ออกงานล่าสุด · ชิปช่วงวัน-เวร-แผนก
//   การ์ดหัวเรื่อง 5 ตัวเลข + ภาพประกอบ
//   แผง: สถิติการเข้า-ออกงาน (คอลัมน์ซ้อน) · แนวโน้มการมาสาย (เส้น)
//        สถิติแบ่งตามเวร · สรุปการขาดงาน (โดนัท)
//        สรุปการมาสาย 5 อันดับ · สรุปสถานะการมาทำงาน
//
// ⚠️ ระบบไม่มีข้อมูล "ลา" (ลากิจ/ลาป่วย/ลาพักร้อน) — โดนัทสรุปการขาดงานจึงมีแต่ "ขาดงาน"
//    ขาดงาน = พนักงานทั้งหมด × จำนวนวัน − จำนวนครั้งที่ลงเวลา

type Row = { emp: string; seq?: number; name: string; date: string; in: string; out: string; shift: string; dept: string; late: boolean; status: string }
type Analytics = {
  summary: { date: string; date_from: string; date_to: string; days: number; punched: number; done: number; open: number; late: number; early: number; out_area: number }
  recent: Row[]
  total_staff: number
  days: { date: string; punched: number; on_time: number; late: number; early: number; avg_late_min: number }[]
  shifts: { name: string; persons: number; late: number; early: number; avg_in: string }[]
  top_late: { emp: string; name: string; dept: string; count: number; avg_min: number }[]
  avg_late_min: number
  late_rows: { emp: string; min: number }[]
}
type TenantStatus = { registered: boolean; request_type?: string; demo_expires_at?: string | null; demo_days_left?: number | null; expired?: boolean }

/** ป้ายวัน dd/mm สำหรับแกนกราฟ */
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const deptName = (d?: string) => (d && d.trim() !== '' ? d : 'ไม่ระบุแผนก')

const SHIFT_ICON: Record<ShiftKind, string> = { morning: 'haze', afternoon: 'sun', night: 'moon' }
const shiftColor = (k: ShiftKind) => `var(--shift-${k}-icon)`
const shortShift = (s: string) => s.replace(/\s*\(.*\)\s*$/, '')

// ชุดสีของกราฟการเข้า-ออกงาน (ตรงกับการ์ดสรุปด้านบน)
const IO_SERIES = [
  { key: 'on_time', label: 'ตรงเวลา', color: 'var(--ok)' },
  { key: 'late', label: 'มาสาย', color: 'var(--warn)' },
  { key: 'absent', label: 'ขาดงาน', color: 'var(--danger)' },
  { key: 'early', label: 'ออกก่อนเวลา', color: 'var(--info)' },
]

/** หัวแผงย่อย: ป้ายเล็ก + ค่าตัวใหญ่ (Figma: "มากที่สุด / รวมทั้งหมด") */
function Headline({ label, value, unit, align = 'left' }: { label: string; value: string; unit?: string; align?: 'left' | 'right' }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        <span style={{ ...TEXT.h3, color: 'var(--text)' }}>{value}</span>
        {unit && <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>{unit}</span>}
      </div>
    </div>
  )
}

/** การ์ดคนล่าสุดในหัวเรื่อง — Figma Variant2: รูป 50 + ป้ายเวรมุมขวาล่าง + ชื่อ/แผนก + ป้ายเวลา
    ยังไม่ออกเวร = โชว์เวลาเข้า · ออกแล้ว = โชว์เวลาออก (สีตามสถานะ) */
function RecentMini({ r }: { r: Row }) {
  const out = r.out && r.out !== '—'
  const tone = r.late ? 'late' : out ? 'ok' : 'ok'
  const color = r.late ? 'var(--warn)' : 'var(--ok)'
  const bg = r.late ? 'var(--warn-light)' : 'var(--ok-light)'
  const kind = shiftKindOf(r.shift)
  return (
    <div className="bg-bg rounded-xl" style={{
      width: 136, flex: 'none', padding: 'var(--sp-3) var(--sp-2)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)',
    }}>
      <span style={{ position: 'relative', lineHeight: 0 }} title={r.shift !== '—' ? r.shift : undefined}>
        <Avatar name={r.name} seed={r.emp} size={50} />
        <span aria-hidden style={{
          position: 'absolute', right: -4, bottom: -2,
          width: 24, height: 24, borderRadius: 'var(--r-full)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: `var(--shift-${kind}-icon)`, color: 'var(--bg)', border: '2px solid var(--bg)', boxSizing: 'content-box',
        }}>
          <Icon name={SHIFT_ICON[kind]} size={14} width={2} />
        </span>
      </span>
      <div style={{ ...TEXT.sm, color: 'var(--text)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
      <div style={{ ...TEXT.sm, color: 'var(--text-dim)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deptName(r.dept)}</div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: 'var(--sp-1) var(--sp-2)', borderRadius: 'var(--r-md)',
        background: bg, color, ...TEXT.sm, whiteSpace: 'nowrap',
      }}>
        <Icon name={tone === 'late' ? 'clock-alert' : 'scan'} size={16} width={2} />
        {out ? `ออก ${clock(r.out)}` : `เข้า ${clock(r.in)}`}
      </span>
    </div>
  )
}

/** legend มุมขวาบนของกราฟ (วาดเอง จะได้ไม่เลื่อนตามกราฟที่ scroll ได้) */
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
      {items.map((s) => (
        <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...TEXT.sm, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flex: 'none' }} />
          {s.label}
        </span>
      ))}
    </span>
  )
}

/** เมฆขาวลอยไปมารอบภาพตึกโรงพยาบาล (มุมขวาล่างของการ์ดหัวเรื่อง) — ตกแต่งล้วน อยู่หลังภาพ
    การ์ดหัวเรื่อง overflow:hidden อยู่แล้ว เมฆที่เลยขอบเลยถูกตัดเอง */
function Clouds() {
  // x/y = % ของการ์ด · s = สเกล · o = ความทึบ · d = คาบการลอย(วิ) · delay = เหลื่อมกัน
  // เกาะรอบ ๆ ตึกโรงพยาบาลฝั่งขวา (x เป็น % ของโซนขวา) — ท้องฟ้าหลังตึก
  const C = [
    { x: -4, y: 12, s: 1.1, o: 0.9, d: 13, delay: 0 },
    { x: 44, y: -2, s: 0.7, o: 0.7, d: 17, delay: -4 },
    { x: 14, y: 40, s: 0.85, o: 0.55, d: 15, delay: -8 },
    { x: 70, y: 22, s: 1.25, o: 0.75, d: 19, delay: -2 },
    { x: 34, y: 62, s: 0.6, o: 0.5, d: 21, delay: -11 },
  ]
  return (
    <div aria-hidden className="pointer-events-none select-none"
      style={{ position: 'absolute', right: 0, bottom: 120, width: 520, height: 200 }}>
      {C.map((c, i) => (
        <svg key={i} className="cloud" width={120} height={48} viewBox="0 0 120 48" fill="none"
          style={{
            position: 'absolute', left: `${c.x}%`, top: `${c.y}%`,
            transformOrigin: 'center', scale: c.s, opacity: c.o,
            animationDuration: `${c.d}s`, animationDelay: `${c.delay}s`,
          }}>
          <path d="M26 46C11.64 46 0 35.7 0 23S11.64 0 26 0c9.3 0 17.46 4.32 22.06 10.82C51.3 8.06 55.7 6.4 60.5 6.4c9.5 0 17.4 6.5 19.2 15.1 1.9-.7 3.9-1.1 6.1-1.1 9.5 0 17.2 6.9 17.2 15.4 0 3.7-1.5 7.1-3.9 9.8-.6.3-1.3.4-2 .4H26Z"
            fill="var(--surface-blue)" />   {/* ฟ้าอ่อน — ขาวจะจมหายไปกับพื้นครึ่งบนของการ์ด */}
        </svg>
      ))}
    </div>
  )
}

export function Overview() {
  const { currentHcode, isSuper, setNav } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  // super: แท็บแรกเป็นภาพรวมทั้งระบบ (ข้อมูลระดับแพลตฟอร์ม) แล้วค่อยตามด้วยของโรงที่เลือก
  const [tab, setTab] = useState<'system' | 'overview' | 'recent'>(isSuper ? 'system' : 'overview')
  // ตัวกรอง: ช่วงวัน + เวร + แผนก (ทุกตัวเลขในหน้าเปลี่ยนตาม)
  // default = 7 วันล่าสุด — กราฟแนวโน้มต้องมีหลายวันถึงจะอ่านออก
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(localISO())
  const [shift, setShift] = useState('')
  const [dept, setDept] = useState('')
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)

  useEffect(() => { setShift(''); setDept(''); setFrom(daysAgoISO(6)); setTo(localISO()) }, [hcode])

  const q = hcode ? `hcode=${encodeURIComponent(hcode)}` : ''
  const fq = filterQS(shift ? [shift] : [], dept ? [dept] : [])
  // analytics = สรุป+กราฟ+เข้าเวรล่าสุด จบใน endpoint เดียว
  const anaF = useFetch<Analytics>(hcode ? `/admin/attendance/analytics?${q}&date_from=${from}&date_to=${to}${fq}` : null, reload)
  const tstatF = useFetch<TenantStatus>(hcode ? `/admin/tenant-status?${q}` : null, reload)
  // ข้อมูลระดับแพลตฟอร์ม (แท็บแรกของ super) — โหลดครั้งเดียว แชร์ให้การ์ดในหัวเรื่อง + แผงล่าง
  const platF = usePlatformOverview(reload)
  const ana = anaF.data, tstat = tstatF.data

  const multiDay = from !== to
  const isToday = !multiDay && to === localISO()
  const dayLabel = isToday ? 'วันนี้' : multiDay ? `${thShort(from)} – ${thShort(to)}` : thShort(to)

  // สถิติรายวัน — ขาดงานของแต่ละวัน = พนักงานทั้งหมด − คนที่ลงเวลาวันนั้น
  const dayGroups = useMemo(() => (ana?.days ?? []).map((d) => ({
    label: dm(d.date),
    values: {
      on_time: d.on_time,
      late: d.late,
      absent: Math.max(0, (ana?.total_staff ?? 0) - d.punched),
      early: d.early,
    },
  })), [ana])

  // ไม่ใช่ super แล้วเลือก "ทุกโรงพยาบาล" = ยังไม่รู้ว่าจะดูโรงไหน
  if (currentHcode === '*' && !isSuper) return <PickHospital />

  const s = ana?.summary
  const days = s?.days ?? 1
  const staff = ana?.total_staff ?? 0
  const onTime = s ? Math.max(0, s.punched - s.late) : undefined
  const absent = s ? Math.max(0, staff * days - s.punched) : undefined
  const u = multiDay ? 'ครั้ง' : 'คน'

  const HERO = [
    { label: 'พนักงาน', v: ana ? staff : undefined, unit: 'คน', tone: 'accent' as const, icon: 'person' },
    { label: 'ตรงเวลา', v: onTime, unit: u, tone: 'ok' as const, icon: 'scan' },
    { label: 'มาสาย', v: s?.late, unit: u, tone: 'warn' as const, icon: 'clock-alert' },
    { label: 'ขาดงาน', v: absent, unit: u, tone: 'danger' as const, icon: 'clock-x' },
    { label: 'ออกก่อนเวลา', v: s?.early, unit: u, tone: 'info' as const, icon: 'time-duration-off' },
  ]

  // ---------- เวร ----------
  const shifts = (ana?.shifts ?? []).filter((x) => x.name !== '—')
  const shiftTotal = shifts.reduce((a, b) => a + b.persons, 0)
  const topShift = shifts.reduce<typeof shifts[number] | null>((a, b) => (!a || b.persons > a.persons ? b : a), null)
  const shiftPct = (v: number) => (shiftTotal > 0 ? Math.round((v / shiftTotal) * 100) : 0)

  // ---------- ขาดงาน (ไม่มีข้อมูลลา → ชนิดอื่นเป็น 0) ----------
  const absSegs = [
    { v: absent ?? 0, color: 'var(--danger)', label: 'ขาดงาน' },
    { v: 0, color: 'var(--accent)', label: 'ลากิจ' },
    { v: 0, color: 'var(--ok)', label: 'ลาป่วย' },
    { v: 0, color: 'var(--warn)', label: 'ลาพักร้อน' },
    { v: 0, color: 'var(--info)', label: 'อื่นๆ' },
  ]

  const top5 = (ana?.top_late ?? []).slice(0, 5)
  const trend = (ana?.days ?? []).map((d) => ({ label: dm(d.date), v: d.avg_late_min }))
  // แท็บ — super มี "ภาพรวมระบบ" เป็นอันแรก
  const TABS: [typeof tab, string, string][] = [
    ...(isSuper ? [['system', 'ภาพรวมระบบ', 'hospital'] as [typeof tab, string, string]] : []),
    ['overview', 'ภาพรวมการเข้า/ออกงาน', 'calendar-week'],
    ['recent', 'การเข้า/ออกงานล่าสุด', 'scan'],
  ]
  const filterMeta = [dayLabel,
    shift ? (shiftOpts.find((o) => o.value === shift)?.label ?? shift) : 'ทุกเวร',
    dept ? (deptOpts.find((o) => o.value === dept)?.label ?? dept) : 'ทุกแผนก',
  ].join(' · ')

  // แถบเตือนเวลาทดลองใช้ (admin โรงเห็นเอง)
  const demoBanner = (() => {
    if (!tstat?.registered || tstat.request_type !== 'demo' || !tstat.demo_expires_at) return null
    const left = tstat.demo_days_left
    const expired = tstat.expired || (left != null && left < 0)
    const tone = expired || (left != null && left <= 7) ? 'var(--danger)' : (left != null && left <= 14) ? 'var(--warn)' : 'var(--accent)'
    const msg = expired
      ? `หมดระยะทดลองใช้แล้ว (${tstat.demo_expires_at}) — ติดต่อผู้ดูแลระบบเพื่อต่ออายุ`
      : `ทดลองใช้ถึง ${tstat.demo_expires_at} (เหลือ ${left} วัน)${left != null && left <= 14 ? ' — ใกล้หมดอายุ' : ''}`
    return (
      <div className="rounded-lg text-body" style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--surface-alt)', borderLeft: `4px solid ${tone}`, color: tone }}>{msg}</div>
    )
  })()

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง: แท็บ + ชิป + ตัวเลขสรุป ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        {tab === 'system' && <Clouds />}
        {/* ภาพประกอบ — สลับตามแท็บ (Figma node 43:13821 / 43:14979) */}
        {/* แท็บภาพรวมระบบไม่มีภาพประกอบ (หัวเรื่องเตี้ย ภาพจะไปทับปุ่ม) */}
        {tab !== 'system' && <img src={tab === 'recent' ? '/hero-scan.svg' : '/hero-dash.svg'} alt="" aria-hidden
          width={tab === 'recent' ? 343 : 480} height={176}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 0, bottom: 0 }} />}

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          {/* แท็บ 2 อัน (Figma Frame 25) — อันที่เลือกเป็นปุ่มทึบสีหลัก */}
          {/* Figma node 43:13945 — กรอบขาวทรงแคปซูล ขอบดำ 10% padding 8 gap 8
              แท็บที่เลือก = แคปซูลสีหลักตัวอักษรขาว · ที่ไม่ได้เลือก = แคปซูลพื้นเทาอ่อนตัวอักษรดำ */}
          <span className="inline-flex gap-2 items-center flex-wrap" style={{
            background: 'var(--bg)', padding: 'var(--sp-2)',
            borderRadius: 'var(--r-full)', border: '1px solid rgba(0,0,0,0.1)',
          }}>
            {TABS.map(([k, label, icon]) => (
              <Button key={k} variant={tab === k ? 'primary' : 'soft'} size="md" pill
                onClick={() => setTab(k)} icon={<Icon name={icon} size={24} width={1.8} />}>
                {label}
              </Button>
            ))}
          </span>

          <span className="inline-flex gap-2 items-center flex-wrap">
            <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={anaF.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรช
            </Button>
            {/* ตัวกรองย้ายไปแถวเหนือแผงเนื้อหาแล้ว — ในหัวเรื่องเหลือแค่ปุ่มรีเฟรช */}
          </span>
        </div>

        {/* แท็บ "ล่าสุด" = การ์ดคนล่าสุด 5 คนในหัวเรื่อง (Figma Variant2) */}
        {/* key={tab} -> เปลี่ยนแท็บแล้ว React สร้าง node ใหม่ .tab-in เล่นซ้ำ */}
        <div key={tab} className="tab-in">
        {tab === 'system' ? (
          /* ภาพประกอบโรงพยาบาล (Figma 359:9444) วางขวา การ์ดสรุปกินที่เหลือ — จอแคบซ่อนภาพ */
          <div className="relative mt-4 flex items-end gap-2">
            <div style={{ flex: 1, minWidth: 0 }}><PlatformStats d={platF.data} loading={platF.loading} /></div>
            {/* ล้นออกนอกขอบล่าง/ขวาของหัวเรื่อง (การ์ดตัด overflow อยู่แล้ว) */}
            <img src="/hero-hospital.svg" alt="" aria-hidden width={360} height={360}
              className="hide-sm pointer-events-none select-none"
              style={{ flex: 'none', marginBottom: -64, marginRight: 'calc(var(--sp-6) * -1)' }} />
          </div>
        ) : tab === 'recent' ? (
          <div className="relative mt-4 flex gap-2 items-center flex-wrap">
            {(ana?.recent ?? []).slice(0, 5).map((r) => (
              <RecentMini key={`${r.emp}:${r.date}:${r.seq ?? 0}`} r={r} />
            ))}
            {ana && ana.recent.length === 0 && (
              <div className="bg-bg rounded-xl text-body text-text-dim" style={{ padding: 'var(--sp-4) var(--sp-6)' }}>
                {isToday ? 'ยังไม่มีคนเข้าเวรวันนี้' : `ไม่มีข้อมูลเข้าเวรช่วง ${dayLabel}`}
              </div>
            )}
            {!ana && <div className="bg-bg rounded-xl" style={{ padding: 'var(--sp-4) var(--sp-6)' }}><Loading /></div>}
          </div>
        ) : (
        <div className="relative mt-4 flex gap-2 flex-wrap">
          {HERO.map((k) => (
            <StatCard key={k.label} tone={k.tone} label={k.label} unit={k.unit}
              icon={<Icon name={k.icon} size={24} color="currentColor" />}
              value={k.v != null ? nf(k.v) : anaF.loading ? '…' : '—'} />
          ))}
        </div>
        )}
        </div>
      </div>

      {demoBanner}

      {anaF.err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {anaF.err}</div>}

      <div key={tab} className="tab-in tab-in-late flex flex-col gap-4">
      {/* แถวตัวกรอง — อยู่เหนือแผงเนื้อหา (แท็บภาพรวมระบบไม่ได้ใช้ตัวกรองของโรง) */}
      {tab !== 'system' && (
        <div className="flex gap-2 items-center flex-wrap">
          <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
            {/* backend รับช่วงยาวสุด 31 วัน — ล็อกขอบให้เลือกเกินไม่ได้ */}
            <DateRangePicker bare from={from} to={to} max={localISO()}
              onFrom={(v) => setFrom(v < isoAddDays(to, -30) ? isoAddDays(to, -30) : v)}
              onTo={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
          </FilterChip>
          <FilterChip icon={<Icon name="calendar-time" size={24} width={1.8} />} label="เลือกเวร">
            <SearchSelect bare hideCaret value={shift} onChange={setShift}
              options={[{ value: '', label: 'ทั้งหมด' }, ...shiftOpts]}
              placeholder="ทั้งหมด" searchPlaceholder="ค้นเวร…" maxTriggerWidth={120} />
          </FilterChip>
          <FilterChip icon={<Icon name="briefcase" size={24} width={1.8} />} label="เลือกแผนก">
            <SearchSelect bare hideCaret value={dept} onChange={setDept}
              options={[{ value: '', label: 'ทั้งหมด' }, ...deptOpts]}
              placeholder="ทั้งหมด" searchPlaceholder="ค้นแผนก…" maxTriggerWidth={120} />
          </FilterChip>
        </div>
      )}
      {tab === 'system' ? (
        /* ---------- แท็บ 1 (super): ภาพรวมทั้งระบบ ---------- */
        <PlatformPanels d={platF.data} err={platF.err} />
      ) : !hcode ? (
        <PickHospital />
      ) : tab === 'recent' ? (
        /* ---------- แท็บ 2: การเข้า/ออกงานล่าสุด ---------- */
        <SectionPanel title="การเข้า/ออกงานล่าสุด" meta={filterMeta}>
          {!ana ? <Loading /> : (ana.recent.length === 0 ? (
            <div style={{ ...TEXT.body, padding: '48px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>
              {isToday ? 'ยังไม่มีคนเข้าเวรวันนี้' : `ไม่มีข้อมูลเข้าเวรช่วง ${dayLabel}`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {ana.recent.map((r) => (
                <div key={`${r.emp}:${r.date}:${r.seq ?? 0}`} className="row-hover" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                  padding: 'var(--sp-2) var(--sp-3)',
                  border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
                }}>
                  <Avatar name={r.name} seed={r.emp} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ ...TEXT.sm, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deptName(r.dept)}{r.shift !== '—' ? ` · ${shortShift(r.shift)}` : ''}{multiDay ? ` · ${thShort(r.date)}` : ''}
                    </div>
                  </div>
                  <div style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    เข้า {clock(r.in)}{r.out !== '—' ? ` · ออก ${clock(r.out)}` : ' · ยังไม่ออกเวร'}
                  </div>
                  <StatusBadge status={r.late ? 'late' : 'ontime'} />
                </div>
              ))}
            </div>
          ))}
        </SectionPanel>
      ) : (
        <>
          {/* ---------- แถว 1: สถิติการเข้า-ออกงาน + แนวโน้มการมาสาย ---------- */}
          <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px,100%), 1fr))' }}>
            <SectionPanel title="สถิติการเข้า-ออกงาน"
              meta={<Legend items={IO_SERIES} />}>
              {!ana ? <Loading /> : (
                /* columnWidth 56 = แท่งกว้างคงที่ วันเยอะเกินกล่องแล้วเลื่อนแนวนอนเอา */
                <StackedColumns groups={dayGroups} series={IO_SERIES} height={185} unit={u} axisLabel="วันที่" columnWidth={56} />
              )}
            </SectionPanel>

            <SectionPanel title="สถิติการเข้า-ออกงาน"
              meta={ana ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: 'var(--sp-1) var(--sp-3)', borderRadius: 'var(--r-full)',
                  background: 'var(--accent-light)', color: 'var(--accent-active)', ...TEXT.sm,
                }}>
                  <Icon name="progress-alert" size={16} width={2} />
                  เฉลี่ย {nf(ana.avg_late_min)} นาที
                </span>
              ) : undefined}>
              {!ana ? <Loading /> : (
                <TrendLine points={trend} height={185} />
              )}
            </SectionPanel>
          </div>

          {/* ---------- แถว 2: สถิติแบ่งตามเวร + สรุปการขาดงาน ---------- */}
          <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
            <SectionPanel title="สถิติแบ่งตามเวร" meta={filterMeta}>
              {!ana ? <Loading /> : shiftTotal === 0 ? (
                <div style={{ ...TEXT.body, padding: '48px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>ไม่มีข้อมูลในช่วงที่เลือก</div>
              ) : (
                /* สูงเต็มแผง — การ์ดล่างยืดกินที่ว่างที่เหลือ (แผงคู่ข้างสูงกว่า) */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
                    <Headline label="มากที่สุด" value={topShift ? `เวร${shortShift(topShift.name)}` : '—'}
                      unit={topShift ? `${shiftPct(topShift.persons)}%` : undefined} />
                    <Headline label="รวมทั้งหมด" value={nf(shiftTotal)} unit={u} align="right" />
                  </div>
                  <div style={{ margin: 'var(--sp-4) 0' }}>
                    <SegmentBar segs={shifts.map((x) => ({ v: x.persons, color: shiftColor(shiftKindOf(x.name)), label: shortShift(x.name) }))} />
                  </div>
                  <div className="grid gap-2" style={{ flex: 1, gridTemplateColumns: `repeat(${Math.min(3, shifts.length)}, minmax(0,1fr))` }}>
                    {shifts.map((x) => (
                      <StatCard key={x.name} label={`เวร${shortShift(x.name)}`} color={shiftColor(shiftKindOf(x.name))} bg="var(--surface-alt)"
                        icon={<Icon name={SHIFT_ICON[shiftKindOf(x.name)]} size={24} color="currentColor" />}
                        value={nf(x.persons)} unit={`${u} (${shiftPct(x.persons)}%)`} />
                    ))}
                  </div>
                </div>
              )}
            </SectionPanel>

            <SectionPanel title="สรุปการขาดงาน" meta={filterMeta}>
              {!ana ? <Loading /> : (
                <div style={{ padding: 'var(--sp-4) 0' }}>
                  <Donut segs={absSegs} size={200} unit="คน" legendSize={14}
                    centerLabel="รวมทั้งหมด" centerValue={nf(absent)} />
                  <p className="text-sm-fig mt-4 mb-0 text-text-dim">
                    ระบบยังไม่มีข้อมูลการลา — ตัวเลขลาทุกประเภทจึงเป็น 0 · ขาดงาน = พนักงานทั้งหมด × {nf(days)} วัน − จำนวนครั้งที่ลงเวลา
                  </p>
                </div>
              )}
            </SectionPanel>
          </div>

          {/* ---------- แถว 3: มาสาย 5 อันดับ + สถานะการมาทำงาน ---------- */}
          <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
            <SectionPanel title="สรุปการมาสาย 5 อันดับ"
              actions={
                <Button variant="ghost" size="sm" pill onClick={() => setNav('rp-late')}
                  iconRight={<Icon name="chevron-down" size={16} width={2} style={{ transform: 'rotate(-90deg)' }} />}>
                  ดูทั้งหมด
                </Button>
              }>
              {!ana ? <Loading /> : top5.length === 0 ? (
                <div style={{ ...TEXT.body, padding: '48px 20px', color: 'var(--ok)', textAlign: 'center' }}>ไม่มีคนมาสายในช่วงที่เลือก — เยี่ยมมาก</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {top5.map((t, i) => (
                    <div key={t.emp} className="row-hover" style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                      padding: 'var(--sp-2) var(--sp-3)',
                      border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
                    }}>
                      {/* วงกลมลำดับ — อันดับต้นเข้มกว่า (Figma ไล่เฉด) */}
                      <span aria-hidden style={{
                        width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: `color-mix(in srgb, var(--accent) ${100 - i * 15}%, var(--bg))`,
                        color: 'var(--bg)', ...TEXT.bodyMed,
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                        <div style={{ ...TEXT.sm, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deptName(t.dept)}</div>
                      </div>
                      <div style={{ minWidth: 96, flex: 'none', padding: 'var(--sp-1) var(--sp-3)', borderLeft: '1px solid var(--control-border)' }}>
                        <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>จำนวน</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-1)' }}>
                          <span style={{ ...TEXT.h3, color: 'var(--text)' }}>{nf(t.count)}</span>
                          <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>ครั้ง</span>
                        </div>
                      </div>
                      <div style={{ minWidth: 96, flex: 'none', padding: 'var(--sp-1) var(--sp-3)', borderLeft: '1px solid var(--control-border)' }}>
                        <div style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>เฉลี่ย</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-1)' }}>
                          <span style={{ ...TEXT.h3, color: 'var(--warn)' }}>{nf(t.avg_min)}</span>
                          <span style={{ ...TEXT.sm, color: 'var(--text-dim)' }}>นาที</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionPanel>

            <SectionPanel title="สรุปสถานะการมาทำงาน" meta={filterMeta}>
              {!ana || !s ? <Loading /> : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
                    <Headline label="มากที่สุด" value="มาทำงานแล้ว" unit={`${nf(s.punched)} ${u}`} />
                    <Headline label="รวมทั้งหมด" value={nf(staff * days)} unit={u} align="right" />
                  </div>
                  <div style={{ margin: 'var(--sp-4) 0' }}>
                    <SegmentBar segs={[
                      { v: onTime ?? 0, color: 'var(--ok)', label: 'ตรงเวลา' },
                      { v: s.late, color: 'var(--warn)', label: 'มาสาย' },
                      { v: absent ?? 0, color: 'var(--danger)', label: 'ขาดงาน' },
                      { v: s.early, color: 'var(--info)', label: 'ออกก่อนเวลา' },
                    ]} />
                  </div>
                  <div className="grid gap-2" style={{ flex: 1, gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridAutoRows: 'minmax(0, 1fr)' }}>
                    <StatCard align="start" bg="var(--surface-alt)" tone="ok" label="มาทำงานแล้ว" unit={u}
                      icon={<Icon name="scan" size={24} color="currentColor" />} value={nf(s.punched)} />
                    <StatCard align="start" bg="var(--surface-alt)" tone="danger" label="ยังไม่มาทำงาน" unit={u}
                      icon={<Icon name="clock-alert" size={24} color="currentColor" />} value={nf(absent)} />
                    <StatCard align="start" bg="var(--surface-alt)" tone="warn" label="มาสาย" unit={u}
                      icon={<Icon name="clock-x" size={24} color="currentColor" />} value={nf(s.late)} />
                    <StatCard align="start" bg="var(--surface-alt)" tone="info" label="ออกก่อนเวลา" unit={u}
                      icon={<Icon name="time-duration-off" size={24} color="currentColor" />} value={nf(s.early)} />
                  </div>
                </div>
              )}
            </SectionPanel>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
