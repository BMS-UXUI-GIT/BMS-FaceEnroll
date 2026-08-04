import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { nf, useServerPage } from '../hooks'
import { daysAgoISO, filterQS, localISO, useAttFilterOptions } from '../components/AttFilters'
import { SearchSelect } from '../components/SearchSelect'
import { Loading } from '../components/Spinner'
import { PAGE_SIZE } from '../components/Pager'
import { PickHospital } from '../components/PickHospital'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { StatCard } from '../components/data-display/StatCard'
import { ShiftBadge, shiftKindOf } from '../components/data-display/ShiftBadge'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterChip } from '../components/inputs/FilterChip'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { TEXT } from '../typography'
import { Icon } from '../icons'
import { useApp } from '../state'
import { IssueBadges } from './attendance/IssueBadges'
import { PunchModal } from './attendance/PunchModal'
import { EmployeeModal } from './attendance/EmployeeModal'
import { FixTimeModal } from './attendance/FixTimeModal'
import type { Daily, DailyRow, LateRow } from './attendance/types'

// หน้าลงเวลา — ตาม Figma node 227:6394
//   การ์ดหัวเรื่อง (ไล่สี surface-blue → ขาว, r-xl) + การ์ดตัวเลข 4 ใบ
//   แถบตัวกรองแบบชิปแคปซูล + ตารางการลงเวลา
//
// หมายเหตุ: ดีไซน์นี้ไม่มีแท็บ "รายเดือน" (ย้ายไปอยู่เมนู "รายงาน" แล้ว)
// และไม่มีแท็บ "รายงานผิดปกติ" — กลายเป็นชิปกรอง "เฉพาะรายงานผิดปกติ" แทน

const mono: React.CSSProperties = { fontFamily: 'var(--mono)' }

/** สลับค่าในลิสต์ตัวกรอง (เลือกซ้ำ = เอาออก) */
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

const SUMMARY = [
  // ชื่อไอคอนตรงกับที่ Figma ใช้ (tabler: user / clock-play / user-scan / clock-exclamation)
  { key: 'punched', label: 'ลงเวลาแล้ว', tone: 'accent', icon: 'person' },
  { key: 'open', label: 'ยังไม่ออกเวร', tone: 'neutral', icon: 'clock-play' },
  { key: 'done', label: 'เข้าออกเวรครบ', tone: 'ok', icon: 'scan' },
  { key: 'late', label: 'มาสาย', tone: 'warn', icon: 'clock-alert' },
] as const

/** แถวนี้มีอะไรผิดปกติไหม (ใช้กับชิป "เฉพาะรายงานผิดปกติ") */
const isIssue = (r: DailyRow) => r.late || r.early || r.no_out || r.out_area === true

/** สร้าง LateRow ให้ FixTimeModal จากแถวรายวัน */
const toLateRow = (r: DailyRow): LateRow => ({
  emp: r.emp, name: r.name, dept: r.dept, date: r.date, shift: r.shift, seq: r.seq,
  io: `${r.in || '—'} / ${r.out || '—'}`,
  issue: r.no_out ? 'ไม่สแกนออก' : r.late ? `มาสาย ${nf(r.late_min)} นาที` : r.early ? `ออกก่อน ${nf(r.early_min)} นาที` : 'สแกนนอกพื้นที่',
})

export function Attendance() {
  const { currentHcode, session } = useApp()
  const hcode = useMemo(() => (currentHcode === '*' ? '' : currentHcode), [currentHcode])
  const [reload, setReload] = useState(0)
  const [punchRow, setPunchRow] = useState<DailyRow | null>(null)
  const [empId, setEmpId] = useState<string | null>(null)
  const [fixRow, setFixRow] = useState<LateRow | null>(null)
  const [search, setSearch] = useState('')
  const [onlyIssue, setOnlyIssue] = useState(false)
  const [dFrom, setDFrom] = useState(daysAgoISO(6))
  const [dTo, setDTo] = useState(localISO())
  const [fShifts, setFShifts] = useState<string[]>([])
  const [fDepts, setFDepts] = useState<string[]>([])
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)
  const q = `hcode=${encodeURIComponent(hcode)}`
  const fq = filterQS(fShifts, fDepts)

  // สลับโรง = ล้างตัวกรองทั้งหมด (เวรคนละชุด แผนกคนละชุด)
  useEffect(() => {
    setSearch(''); setOnlyIssue(false)
    setFShifts([]); setFDepts([]); setDFrom(daysAgoISO(6)); setDTo(localISO())
  }, [hcode])

  // ค้นหาชื่อ/รหัส — หน่วง 300ms แล้วส่งให้ backend (ค้นข้ามทุกหน้า ไม่ใช่แค่หน้าปัจจุบัน)
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(search.trim()), 300); return () => clearTimeout(t) }, [search])
  const sq = dq ? `&q=${encodeURIComponent(dq)}` : ''

  const daily = useServerPage<Daily>(hcode ? `/admin/attendance/daily?${q}&date_from=${dFrom}&date_to=${dTo}${fq}${sq}` : null, reload)
  const allRows = daily.data?.rows ?? []
  // ชิป "เฉพาะรายงานผิดปกติ" กรองบนหน้าที่โหลดมาแล้ว (backend ยังไม่มี query สำหรับกรองข้ามหน้า)
  const rows = onlyIssue ? allRows.filter(isIssue) : allRows

  const [exporting, setExporting] = useState(false)
  const [expErr, setExpErr] = useState<string | null>(null)
  const exportCsv = async () => {
    if (exporting) return
    setExporting(true); setExpErr(null)
    try {
      await api.download(`/admin/attendance/export?${q}&date_from=${dFrom}&date_to=${dTo}${fq}`,
        `attendance_${hcode}_${dFrom}${dFrom !== dTo ? `_${dTo}` : ''}.csv`)
    } catch (e: any) { setExpErr(e?.message || 'ดาวน์โหลดไม่สำเร็จ') }
    finally { setExporting(false) }
  }

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) return <div style={{ ...TEXT.body, padding: 'var(--sp-5)', color: 'var(--text-dim)' }}>ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div>

  const cols: Column<DailyRow>[] = [
    {
      key: 'emp', header: 'พนักงาน', cell: (r) => (
        <button onClick={(e) => { e.stopPropagation(); setEmpId(r.emp) }} title="ดูประวัติย้อนหลัง 30 วัน"
          style={{ ...TEXT.bodyBold, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)', padding: 0, color: 'var(--text)', textAlign: 'left' }}>
          {r.name}
          {session?.role !== 'user' && <span style={{ ...TEXT.caption, ...mono, color: 'var(--text-dim)' }}> #{r.emp}</span>}
        </button>
      ),
    },
    { key: 'dept', header: 'แผนก', cell: (r) => <span style={{ color: 'var(--text-dim)' }}>{r.dept || '—'}</span> },
    { key: 'in', header: 'เข้าเวร', cell: (r) => <span style={{ ...TEXT.bodyBold, color: 'var(--ok)' }}>{r.in || '—'}</span> },
    { key: 'out', header: 'ออกเวร', cell: (r) => <span style={{ ...TEXT.body, color: 'var(--table-row-text)' }}>{r.out || '—'}</span> },
    { key: 'shift', header: 'เวร', cell: (r) => <ShiftBadge shift={shiftKindOf(r.shift)} label={r.shift} /> },
    {
      key: 'gps', header: 'GPS', cell: (r) => r.gps
        ? <span style={{ ...TEXT.body, color: r.out_area ? 'var(--danger)' : 'var(--ok)' }}>● {r.out_area ? 'นอกพื้นที่' : 'มีพิกัด'}</span>
        : <span style={{ ...TEXT.body, color: 'var(--text-dim)' }}>— ไม่มี</span>,
    },
    { key: 'status', header: 'สถานะ', cell: (r) => <IssueBadges r={r} /> },
  ]

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {/* ---------- การ์ดหัวเรื่อง + ตัวเลขสรุป ---------- */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 'var(--r-xl)',
        // Figma: gradient handles (0.5,1) -> (0.5,0) = ไล่จากล่างขึ้นบน (#F0F6FD -> ขาว)
        background: 'linear-gradient(to top, var(--hero-bg), var(--bg))',
        padding: 'var(--sp-6)',
      }}>
        {/* ภาพประกอบ export จาก Figma (node I227:7677;227:9723) — 298x298 ชิดขวา
            เยื้องลง 19px แล้วถูก crop ด้านล่างด้วย overflow:hidden ตามดีไซน์ */}
        <img src="/hero-attendance.svg" alt="" aria-hidden width={298} height={298}
          className="hide-sm"
          style={{ position: 'absolute', right: 0, top: 19, pointerEvents: 'none', userSelect: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ ...TEXT.h2, margin: 0, color: 'var(--text)' }}>การลงเวลาของพนักงาน</h1>
            <p style={{ ...TEXT.body, margin: 'var(--sp-2) 0 0', color: 'color-mix(in srgb, var(--text-faint) 50%, transparent)' }}>
              ตรวจสอบการลงเวลาของพนักงานทั้งหมด
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={daily.loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรชข้อมูลล่าสุด
            </Button>
            {/* Figma: cloud-download 20 ซ้าย · ข้อความ 12/400 · chevron-down 14 ขวา */}
            <Button variant="primary" size="lg" pill onClick={exportCsv} disabled={exporting}
              icon={<Icon name="download" size={20} width={1.8} />}
              iconRight={<Icon name="chevron-down" size={14} width={2} />}>
              {exporting ? 'กำลังส่งออก…' : 'ดาวโหลดไฟล์'}
            </Button>
          </div>
        </div>

        <div style={{
          position: 'relative',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', maxWidth: 760,
        }}>
          {SUMMARY.map((s) => (
            <StatCard key={s.key} tone={s.tone} label={s.label} unit="คน"
              icon={<Icon name={s.icon} size={24} color="currentColor" />}
              value={daily.data ? nf((daily.data.summary as any)[s.key]) : daily.loading ? '…' : '—'} />
          ))}
        </div>
      </div>

      {/* ---------- แถบตัวกรอง (Figma node 227:7677) ---------- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน" />

        <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
          <DateRangePicker bare from={dFrom} to={dTo} onFrom={setDFrom} onTo={setDTo} max={localISO()} />
        </FilterChip>

        <FilterChip icon={<Icon name="calendar-time" size={24} width={1.8} />} label="เลือกเวร">
          <SearchSelect bare hideCaret multi values={fShifts} onToggle={(v) => setFShifts(toggle(fShifts, v))}
            options={shiftOpts} placeholder="ทั้งหมด" searchPlaceholder="ค้นเวร…" maxTriggerWidth={120} />
        </FilterChip>

        <FilterChip icon={<Icon name="briefcase" size={24} width={1.8} />} label="เลือกแผนก">
          <SearchSelect bare hideCaret multi values={fDepts} onToggle={(v) => setFDepts(toggle(fDepts, v))}
            options={deptOpts} placeholder="ทั้งหมด" searchPlaceholder="ค้นแผนก…" maxTriggerWidth={120} />
        </FilterChip>

        <FilterChip variant="action" active={onlyIssue} onClick={() => setOnlyIssue((v) => !v)}
          icon={<Icon name="progress-alert" size={14} width={2.2} />} label="เฉพาะรายงานผิดปกติ" />

        {(fShifts.length > 0 || fDepts.length > 0 || onlyIssue) && (
          <Button variant="ghost" size="sm" onClick={() => { setFShifts([]); setFDepts([]); setOnlyIssue(false) }}>ล้างตัวกรอง</Button>
        )}
      </div>

      {expErr && <div style={{ ...TEXT.body, padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-lg)', background: 'var(--danger-light)', color: 'var(--danger)' }}>ดาวน์โหลดไม่สำเร็จ: {expErr}</div>}

      {/* ---------- ตาราง ---------- */}
      <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {daily.err
          ? <div style={{ ...TEXT.body, padding: 'var(--sp-4) var(--sp-4)', color: 'var(--danger)' }}>ผิดพลาด: {daily.err}</div>
          : daily.loading && !daily.data
            ? <Loading />
            : (
              <>
                <DataTable columns={cols} rows={rows} onRowClick={(r) => setPunchRow(r)}
                  rowKey={(r) => `${r.emp}:${r.date}:${r.seq ?? 0}`}
                  empty={dq ? 'ไม่พบที่ตรงกับคำค้น' : onlyIssue ? 'ไม่มีรายการผิดปกติในหน้านี้ 🎉' : 'ไม่มีการลงเวลาในช่วงที่เลือก'} />
                {!onlyIssue && (
                  <Pagination page={daily.page} pageSize={PAGE_SIZE} total={daily.data?.total ?? 0}
                    shown={rows.length} onPage={daily.setPage} />
                )}
              </>
            )}
      </div>

      {punchRow && daily.data && (
        <PunchModal row={punchRow} fences={daily.data.fences} date={punchRow.date}
          onClose={() => setPunchRow(null)}
          onFix={session?.role !== 'user' && isIssue(punchRow) ? () => { setFixRow(toLateRow(punchRow)); setPunchRow(null) } : undefined} />
      )}
      {empId && <EmployeeModal hcode={hcode} empId={empId} onClose={() => setEmpId(null)} />}
      {fixRow && <FixTimeModal hcode={hcode} row={fixRow} onClose={() => setFixRow(null)}
        onSaved={() => { setFixRow(null); setReload((r) => r + 1) }} />}
    </div>
  )
}
