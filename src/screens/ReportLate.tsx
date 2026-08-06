import { useEffect, useMemo, useRef, useState } from 'react'
import { clock, nf, useFetch } from '../hooks'
import { filterQS, isoAddDays, localISO, selLabel, toggle, useAttFilterOptions } from '../components/AttFilters'
import { thShort } from '../components/DatePicker'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { PickHospital } from '../components/PickHospital'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { SearchInput } from '../components/inputs/SearchInput'
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

type Analytics = {
  late_total: number   // จำนวนจริงทั้งหมด (late_rows โดนตัดตาม limit)
  early_total: number
  late_rows: { emp: string; name: string; dept: string; date: string; shift: string; in: string; min: number }[]
  early_rows: { emp: string; name: string; dept: string; date: string; shift: string; out: string; min: number }[]
}

/** แถวแสดงผลร่วมของ 2 แผง (time = เวลาเข้า/ออก แล้วแต่ฝั่ง) */
type IssueRow = { emp: string; name: string; dept: string; date: string; shift: string; time: string; min: number }

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
    <div style={{
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

/** การ์ด 1 คน — รูป + ชื่อ/แผนก + เวลา + จำนวนนาที (Figma "พนักงานที่มาสาย") */
function IssueItem({ r, timeLabel, minLabel, color, showDate }: {
  r: IssueRow
  timeLabel: string
  minLabel: string
  color: string
  showDate: boolean
}) {
  return (
    <div className="row-hover" style={{
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
      <Cell label={timeLabel} value={clock(r.time).replace(' น.', '')} unit="น." />
      <Cell label={minLabel} value={nf(r.min)} unit="นาที" color={color} />
    </div>
  )
}

/** โชว์ทีละ 10 คน — backend บางตัว (และ mock) ไม่สนใจ limit/offset ที่ส่งไป
    ถ้ามาเกินหน้าละ 10 ก็ตัดเองฝั่งหน้าเว็บ ไม่งั้นรายชื่อยาวทั้งหน้า */
const pageSlice = (rows: IssueRow[], page: number) =>
  (rows.length > PAGE_SIZE ? rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : rows)

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
          {[0, 1].map((c) => (
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

function IssueList({ rows: allRows, total, page, onPage, timeLabel, minLabel, color, showDate, loading, empty }: {
  rows: IssueRow[]
  total: number
  page: number
  onPage: (p: number) => void
  timeLabel: string
  minLabel: string
  color: string
  showDate: boolean
  loading: boolean
  empty: string
}) {
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
          : rows.map((r, i) => (
            <IssueItem key={`${r.emp}:${r.date}:${i}`} r={r} timeLabel={timeLabel} minLabel={minLabel} color={color} showDate={showDate} />
          ))}
      {total > PAGE_SIZE && (
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
  // ดูทีละฝั่ง (Figma มี 2 การ์ด แต่ผู้ใช้ขอเหลือใบเดียว + สวิตช์)
  const [view, setView] = useState<'late' | 'early'>('late')
  const [latePage, setLatePage] = useState(0)
  const [earlyPage, setEarlyPage] = useState(0)
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)

  // ค้นชื่อ/รหัส/แผนก — หน่วง 300ms แล้วกรองจากข้อมูลที่โหลดมา (backend ยังไม่มี q ให้ endpoint นี้)
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(search.trim().toLowerCase()), 300); return () => clearTimeout(t) }, [search])

  // สลับโรง = ล้างตัวกรอง + กลับมาดูวันนี้ · เปลี่ยนเงื่อนไข = กลับหน้าแรกทั้งสองแผง
  useEffect(() => { setFShifts([]); setFDepts([]); setSearch(''); setFrom(localISO()); setTo(localISO()) }, [hcode])
  useEffect(() => { setLatePage(0); setEarlyPage(0) }, [from, to, fShifts, fDepts, dq, hcode])

  const fq = filterQS(fShifts, fDepts)
  const anaF = useFetch<Analytics>(hcode
    ? `/admin/attendance/analytics?hcode=${encodeURIComponent(hcode)}&date_from=${from}&date_to=${to}${fq}`
      + `&limit=${PAGE_SIZE}&late_offset=${latePage * PAGE_SIZE}&early_offset=${earlyPage * PAGE_SIZE}`
    : null, reload)

  const lateRows = useMemo<IssueRow[]>(
    () => (anaF.data?.late_rows ?? []).map((r) => ({ emp: r.emp, name: r.name, dept: r.dept, date: r.date, shift: r.shift, time: r.in, min: r.min })),
    [anaF.data])
  const earlyRows = useMemo<IssueRow[]>(
    () => (anaF.data?.early_rows ?? []).map((r) => ({ emp: r.emp, name: r.name, dept: r.dept, date: r.date, shift: r.shift, time: r.out, min: r.min })),
    [anaF.data])

  const match = (r: IssueRow) => !dq
    || r.name.toLowerCase().includes(dq) || r.emp.toLowerCase().includes(dq) || (r.dept ?? '').toLowerCase().includes(dq)
  const lateShown = dq ? lateRows.filter(match) : lateRows
  const earlyShown = dq ? earlyRows.filter(match) : earlyRows

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) {
    return <div className="max-w-(--page-max) text-body text-text-dim">ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div>
  }

  const late = view === 'late'
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
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        {/* ภาพประกอบ (Figma node 114:33516) — ยึดขวา ส่วนที่เกินถูก crop ตามดีไซน์ */}
        <img src={asset("/hero-late.svg")} alt="" aria-hidden width={356} height={232}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 0, bottom: 0 }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">ติดตามการเข้า-ออกงานผิดเวลา</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              ติดตามพนักงานที่มาสายหรือออกก่อนเวลาที่กำหนด
            </p>
          </div>
          {/* Figma หน้านี้ไม่มีปุ่มรีเฟรช แต่หน้ารายงานอื่นมีทุกหน้า — คงไว้ให้ใช้งานเหมือนกัน */}
          <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={anaF.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรช
          </Button>
        </div>

        {/* การ์ดสรุป 2 ใบ (Figma: ไอคอนซ้าย ข้อความขวา) */}
        <div className="relative mt-4 flex gap-4 flex-wrap">
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
      </div>

      {anaF.err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {anaF.err}</div>}

      {/* ---------- ค้นหา + ตัวกรอง (แถวเดียวกัน เหนือแผงรายชื่อ) ---------- */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput grow value={search} onChange={setSearch} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน / แผนก" />
        <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
          {/* backend รับช่วงยาวสุด 31 วัน — ล็อกขอบให้เลือกเกินไม่ได้ */}
          <DateRangePicker bare from={from} to={to} max={localISO()}
            onFrom={(v) => setFrom(v < isoAddDays(to, -30) ? isoAddDays(to, -30) : v)}
            onTo={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
        </FilterChip>
        <FilterChip icon={<Icon name="calendar-time" size={24} width={1.8} />} label="เลือกเวร">
          <SearchSelect bare hideCaret multi values={fShifts} onToggle={(v) => setFShifts(toggle(fShifts, v))} onClear={() => setFShifts([])}
            options={shiftOpts}
            placeholder="ทั้งหมด" searchPlaceholder="ค้นเวร…" maxTriggerWidth={120} />
        </FilterChip>
        <FilterChip icon={<Icon name="briefcase" size={24} width={1.8} />} label="เลือกแผนก">
          <SearchSelect bare hideCaret multi values={fDepts} onToggle={(v) => setFDepts(toggle(fDepts, v))} onClear={() => setFDepts([])}
            options={deptOpts}
            placeholder="ทั้งหมด" searchPlaceholder="ค้นแผนก…" maxTriggerWidth={120} />
        </FilterChip>
      </div>

      {/* ---------- แผงรายชื่อใบเดียว สลับฝั่งด้วยชิป ---------- */}
      <SectionPanel
        title={late ? 'พนักงานที่มาสาย' : 'พนักงานที่ออกก่อนเวลา'}
        meta={rangeMeta}
        filters={<>
          <FilterChip outlined variant="choice" tone="warn" active={late} onClick={() => setView('late')}
            icon={<Icon name="clock-alert" size={16} width={2} />} label="มาสาย" />
          <FilterChip outlined variant="choice" tone="accent" active={!late} onClick={() => setView('early')}
            icon={<Icon name="time-duration-off" size={16} width={2} />} label="ออกก่อนเวลา" />
        </>}
      >
        {late
          ? (
            <IssueList rows={lateShown} total={dq ? lateShown.length : (anaF.data?.late_total ?? lateShown.length)}
              page={latePage} onPage={setLatePage}
              timeLabel="เวลาเข้า" minLabel="สาย" color="var(--warn)" showDate={multiDay}
              loading={anaF.loading} empty={dq ? 'ไม่พบพนักงานที่ตรงกับที่ค้นหา' : 'ไม่มีคนมาสายในช่วงที่เลือก'} />
          )
          : (
            <IssueList rows={earlyShown} total={dq ? earlyShown.length : (anaF.data?.early_total ?? earlyShown.length)}
              page={earlyPage} onPage={setEarlyPage}
              timeLabel="เวลาออก" minLabel="ก่อนเวลา" color="var(--info)" showDate={multiDay}
              loading={anaF.loading} empty={dq ? 'ไม่พบพนักงานที่ตรงกับที่ค้นหา' : 'ไม่มีคนออกก่อนเวลาในช่วงที่เลือก'} />
          )}
      </SectionPanel>
    </div>
  )
}
