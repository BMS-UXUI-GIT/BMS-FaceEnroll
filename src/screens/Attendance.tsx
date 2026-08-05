import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { nf, useServerPage } from '../hooks'
import { daysAgoISO, filterQS, localISO, useAttFilterOptions } from '../components/AttFilters'
import { SearchSelect } from '../components/SearchSelect'
import { Loading } from '../components/Spinner'
import { PickHospital } from '../components/PickHospital'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { StatCard } from '../components/data-display/StatCard'
import { ShiftBadge, shiftKindOf } from '../components/data-display/ShiftBadge'
import { Button } from '../components/inputs/Button'
import { SearchInput } from '../components/inputs/SearchInput'
import { FilterChip } from '../components/inputs/FilterChip'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { Icon } from '../icons'
import { useApp } from '../state'
import { IssueBadges } from './attendance/IssueBadges'
import { EmployeeModal } from './attendance/EmployeeModal'
import type { Daily, DailyRow } from './attendance/types'
import { asset } from '../assets'

// หน้าลงเวลา — ตาม Figma node 227:6394
//   การ์ดหัวเรื่อง (ไล่สี surface-blue → ขาว, r-xl) + การ์ดตัวเลข 4 ใบ
//   แถบตัวกรองแบบชิปแคปซูล + ตารางการลงเวลา
//
// หมายเหตุ: ดีไซน์นี้ไม่มีแท็บ "รายเดือน" (ย้ายไปอยู่เมนู "รายงาน" แล้ว)
// และไม่มีแท็บ "รายงานผิดปกติ" — กลายเป็นชิปกรอง "เฉพาะรายงานผิดปกติ" แทน

/** สลับค่าในลิสต์ตัวกรอง (เลือกซ้ำ = เอาออก) */
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

const SUMMARY = [
  // ชื่อไอคอนตรงกับที่ Figma ใช้ (tabler: user / clock-play / user-scan / clock-exclamation)
  { key: 'punched', label: 'ลงเวลาแล้ว', tone: 'accent', icon: 'person' },
  { key: 'open', label: 'ยังไม่ออกเวร', tone: 'neutral', icon: 'clock-play' },
  { key: 'done', label: 'เข้าออกเวรครบ', tone: 'ok', icon: 'scan' },
  { key: 'late', label: 'มาสาย', tone: 'warn', icon: 'clock-alert' },
] as const

/** จำนวนแถวต่อหน้าของตารางนี้ (แยกจาก PAGE_SIZE กลางที่จออื่นใช้) */
const ROWS_PER_PAGE = 10

/** เวลาในตาราง — Figma เขียน "06:02 น." (ไม่มีค่า = ขีด) */
const hhmm = (t?: string | null) => (t ? `${t} น.` : '—')

/** แถวนี้มีอะไรผิดปกติไหม (ใช้กับชิป "เฉพาะรายงานผิดปกติ") */
const isIssue = (r: DailyRow) => r.late || r.early || r.no_out || r.out_area === true

export function Attendance() {
  const { currentHcode, session } = useApp()
  const hcode = useMemo(() => (currentHcode === '*' ? '' : currentHcode), [currentHcode])
  const [reload, setReload] = useState(0)
  // modal รายละเอียดพนักงาน — คลิกแถว = มุมมองรายวัน · คลิกชื่อ = มุมมองรายเดือน
  const [view, setView] = useState<{ row: DailyRow; tab: 'daily' | 'monthly' } | null>(null)
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

  const daily = useServerPage<Daily>(hcode ? `/admin/attendance/daily?${q}&date_from=${dFrom}&date_to=${dTo}${fq}${sq}` : null, reload, ROWS_PER_PAGE)
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
  if (!hcode) return <div className="text-body p-5 text-text-dim">ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div>

  const cols: Column<DailyRow>[] = [
    {
      key: 'emp', header: 'พนักงาน', cell: (r) => (
        <button onClick={(e) => { e.stopPropagation(); setView({ row: r, tab: 'monthly' }) }} title="ดูประวัติย้อนหลัง 30 วัน"
          className="text-body-bold border-none bg-transparent cursor-pointer p-0 text-left text-text font-[family-name:var(--sans)]">
          {r.name}
          {session?.role !== 'user' && <span className="text-caption text-text-dim font-[family-name:var(--mono)]"> #{r.emp}</span>}
        </button>
      ),
    },
    { key: 'dept', header: 'แผนก', cell: (r) => <span className="text-text-dim">{r.dept || '—'}</span> },
    { key: 'in', header: 'เข้าเวร', cell: (r) => <span className="text-body-bold text-ok">{hhmm(r.in)}</span> },
    { key: 'out', header: 'ออกเวร', cell: (r) => <span className="text-body text-table-row">{hhmm(r.out)}</span> },
    // Figma: เวร = คอลัมน์กว้างคงที่ 70 · ป้ายโชว์แค่ "เช้า/บ่าย/ดึก" (ช่วงเวลาอยู่ในหน้าต่างรายละเอียด)
    //        GPS = กึ่งกลาง · สถานะ = ชิดขวา กว้าง 200
    { key: 'shift', header: 'เวร', width: 70, align: 'center', cell: (r) => <ShiftBadge shift={shiftKindOf(r.shift)} /> },
    {
      key: 'gps', header: 'GPS', align: 'center', cell: (r) => r.gps
        ? <span className={`text-body ${r.out_area ? 'text-danger' : 'text-ok'}`}>● {r.out_area ? 'นอกพื้นที่' : 'มีพิกัด'}</span>
        : <span className="text-body text-text-dim">— ไม่มี</span>,
    },
    { key: 'status', header: 'สถานะ', align: 'center', width: 400, cell: (r) => <IssueBadges r={r} /> },
  ]

  return (
    <div className="max-w-[var(--page-max)] flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง + ตัวเลขสรุป ---------- */}
      {/* Figma: gradient handles (0.5,1) -> (0.5,0) = ไล่จากล่างขึ้นบน (#F0F6FD -> ขาว)
          จุดจบของการไล่สีดันลงมาที่ 65% ของความสูง — สีฟ้ากองอยู่ครึ่งล่าง ขาวยาวขึ้น */}
      <div className="relative overflow-hidden rounded-xl p-6 bg-linear-to-t from-hero from-0% to-bg to-65%">
        {/* ภาพประกอบ export จาก Figma (node I227:7677;227:9723) — 298x298 ชิดขวา
            ยึดจากขอบล่างแล้วเยื้องลงไปนอกการ์ด ส่วนที่เกินถูก crop ด้วย overflow:hidden */}
        <img src={asset("/hero-attendance.svg")} alt="" aria-hidden width={298} height={298}
          className="hide-sm absolute right-0 -bottom-24 pointer-events-none select-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">การลงเวลาของพนักงาน</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              ตรวจสอบการลงเวลาของพนักงานทั้งหมด
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
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

        <div className="relative grid gap-2 mt-4 max-w-190 grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))]">
          {SUMMARY.map((s) => (
            <StatCard key={s.key} tone={s.tone} label={s.label} unit="คน"
              icon={<Icon name={s.icon} size={24} color="currentColor" />}
              value={daily.data ? nf((daily.data.summary as any)[s.key]) : daily.loading ? '…' : '—'} />
          ))}
        </div>
      </div>

      {/* ---------- แถบตัวกรอง (Figma node 227:7677) ---------- */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput grow value={search} onChange={setSearch} placeholder="ค้นหา ชื่อ-นามสกุล / รหัสพนักงาน" />

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

        <FilterChip variant="choice" active={onlyIssue} onClick={() => setOnlyIssue((v) => !v)}
          icon={<Icon name="progress-alert" size={14} width={2.2} />} label="เฉพาะรายงานผิดปกติ" />

        {(fShifts.length > 0 || fDepts.length > 0 || onlyIssue) && (
          <Button variant="ghost" size="sm" onClick={() => { setFShifts([]); setFDepts([]); setOnlyIssue(false) }}>ล้างตัวกรอง</Button>
        )}
      </div>

      {expErr && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ดาวน์โหลดไม่สำเร็จ: {expErr}</div>}

      {/* ---------- ตาราง ---------- */}
      {/* Figma: การ์ดตาราง = พื้นขาว · ขอบ 1px #E5E7EB · r-lg (16) */}
      <div className="bg-bg border border-control-border rounded-lg">
        {daily.err
          ? <div className="text-body p-4 text-danger">ผิดพลาด: {daily.err}</div>
          : daily.loading && !daily.data
            ? <Loading />
            : (
              <>
                <DataTable columns={cols} rows={rows} minWidth={1040} onRowClick={(r) => setView({ row: r, tab: 'daily' })}
                  rowKey={(r) => `${r.emp}:${r.date}:${r.seq ?? 0}`}
                  empty={dq ? 'ไม่พบที่ตรงกับคำค้น' : onlyIssue ? 'ไม่มีรายการผิดปกติในหน้านี้ 🎉' : 'ไม่มีการลงเวลาในช่วงที่เลือก'} />
                {!onlyIssue && (
                  <Pagination page={daily.page} pageSize={ROWS_PER_PAGE} total={daily.data?.total ?? 0}
                    shown={rows.length} onPage={daily.setPage} />
                )}
              </>
            )}
      </div>

      {view && daily.data && (
        <EmployeeModal hcode={hcode} row={view.row} fences={daily.data.fences} initialTab={view.tab}
          onClose={() => setView(null)}
          onSaved={() => { setView(null); setReload((r) => r + 1) }} />
      )}
    </div>
  )
}
