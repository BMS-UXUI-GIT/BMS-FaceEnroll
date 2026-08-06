import { useEffect, useMemo, useRef, useState } from 'react'
import { nf, useFetch } from '../hooks'
import { PAGE_SIZE, usePaged } from '../components/Pager'
import { filterQS, isoAddDays, localISO, selLabel, toggle, useAttFilterOptions } from '../components/AttFilters'
import { MonthPicker, thShort } from '../components/DatePicker'
import { DateRangePicker } from '../components/inputs/DateRangePicker'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { SectionPanel } from '../components/layout/SectionPanel'
import { SearchSelect } from '../components/SearchSelect'
import { Button } from '../components/inputs/Button'
import { FilterChip } from '../components/inputs/FilterChip'
import { StatCard } from '../components/data-display/StatCard'
import { DataTable, type Column } from '../components/data-display/DataTable'
import { Pagination } from '../components/data-display/Pagination'
import { exportCSV, exportPDF, exportXLSX, printTable, type Table } from '../utils/exportx'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { asset } from '../assets'

// รายงาน — Figma node 114:36843
//   การ์ดหัวเรื่อง: ชิปช่วงวัน/เวร/แผนก · การ์ดจำนวนเทมเพลต · ภาพประกอบ
//   แผง "เทมเพลต": รายการเทมเพลตซ้าย + ตัวอย่างรายงานขวา · ปุ่ม "ดาวน์โหลดไฟล์" มีเมนู PDF/Excel/CSV/พิมพ์

type Daily = {
  rows: { emp: string; name: string; dept?: string; date: string; in: string; out: string; shift: string; status: string }[]
}
type Monthly = {
  month: string
  days_counted: number
  rows: { emp: string; name: string; dept: string; present: number; late: number; early: number; no_out: number; out_area: number }[]
}
type Analytics = {
  shifts: { name: string; persons: number; late: number; early: number; avg_in: string }[]
  depts: { dept: string; staff: number; present: number; late: number; early: number; no_out: number; rate: number | null }[]
  late_rows: { emp: string; name: string; dept: string; date: string; shift: string; in: string; min: number }[]
  early_rows: { emp: string; name: string; dept: string; date: string; shift: string; out: string; min: number }[]
}

type RptKey = 'daily' | 'monthly' | 'late' | 'dept' | 'shift' | 'person'
const REPORTS: { key: RptKey; label: string }[] = [
  { key: 'daily', label: 'รายงานสรุปการเข้า-ออกงานประจำวัน' },
  { key: 'monthly', label: 'รายงานสรุปการเข้า-ออกงานประจำเดือน' },
  { key: 'late', label: 'รายงานการมาสาย / ออกก่อน' },
  { key: 'dept', label: 'รายงานสรุปตามแผนก' },
  { key: 'shift', label: 'รายงานสรุปตามเวร' },
  { key: 'person', label: 'รายงานสถิติการทำงานรายบุคคล' },
]

const TH_M_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const monthTH = (m: string) => {
  const x = /^(\d{4})-(\d{2})$/.exec(m)
  return x ? `${TH_M_FULL[Number(x[2]) - 1]} ${Number(x[1]) + 543}` : m
}
function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const deptName = (d?: string) => (d && d.trim() !== '' ? d : 'ไม่ระบุแผนก')
const dash = (v?: string) => (v && v.trim() !== '' ? v : '—')

/** เมนูดาวน์โหลด — ปุ่มเดียวตาม Figma แล้วเลือกชนิดไฟล์ในเมนู */
function DownloadMenu({ disabled, busy, onPick }: {
  disabled: boolean
  busy: '' | 'pdf' | 'xlsx' | 'csv' | 'print'
  onPick: (kind: 'pdf' | 'xlsx' | 'csv' | 'print') => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const ITEMS = [
    { kind: 'pdf' as const, label: 'PDF', color: 'var(--danger)' },
    { kind: 'xlsx' as const, label: 'Excel', color: 'var(--ok)' },
    { kind: 'csv' as const, label: 'CSV', color: 'var(--accent)' },
    { kind: 'print' as const, label: 'พิมพ์', color: 'var(--info)' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button variant="primary" size="md" pill disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        icon={<Icon name="download" size={20} width={1.8} />}
        iconRight={<Icon name="chevron-down" size={16} width={2} />}>
        {busy ? 'กำลังส่งออก…' : 'ดาวน์โหลดไฟล์'}
      </Button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + var(--sp-2))', minWidth: 180, zIndex: 40,
          background: 'var(--bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', padding: 'var(--sp-2)',
          display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
        }}>
          {ITEMS.map((it) => (
            <Button key={it.kind} variant="ghost" size="sm" align="start" fullWidth
              onClick={() => { setOpen(false); onPick(it.kind) }}
              icon={<Icon name={it.kind === 'print' ? 'report' : 'download'} size={18} width={1.8} color={it.color} />}>
              {it.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReportsHub() {
  const { currentHcode, session } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [active, setActive] = useState<RptKey>('daily')
  const [reload, setReload] = useState(0)
  const [from, setFrom] = useState(localISO())
  const [to, setTo] = useState(localISO())
  const [month, setMonth] = useState(thisMonth())
  // เวร/แผนก เลือกได้หลายอัน
  const [fShifts, setFShifts] = useState<string[]>([])
  const [fDepts, setFDepts] = useState<string[]>([])
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)
  const [exporting, setExporting] = useState<'' | 'pdf' | 'xlsx' | 'csv' | 'print'>('')
  const [expErr, setExpErr] = useState<string | null>(null)

  // สลับโรง = ล้างตัวกรองทั้งหมด
  useEffect(() => { setFShifts([]); setFDepts([]); setFrom(localISO()); setTo(localISO()); setMonth(thisMonth()) }, [hcode])

  const q = `hcode=${encodeURIComponent(hcode)}`
  const fq = filterQS(fShifts, fDepts)
  // fetch เฉพาะรายงานที่ถูกเลือก (dept/shift/late ใช้ analytics ตัวเดียวกัน)
  const dailyF = useFetch<Daily>(hcode && active === 'daily' ? `/admin/attendance/daily?${q}&date_from=${from}&date_to=${to}${fq}` : null, reload)
  const monthlyF = useFetch<Monthly>(hcode && active === 'monthly' ? `/admin/attendance/monthly?${q}&month=${month}${fq}` : null, reload)
  const anaF = useFetch<Analytics>(hcode && (active === 'late' || active === 'dept' || active === 'shift') ? `/admin/attendance/analytics?${q}&date_from=${from}&date_to=${to}${fq}` : null, reload)

  const loading = active === 'daily' ? dailyF.loading : active === 'monthly' ? monthlyF.loading : active === 'person' ? false : anaF.loading
  const err = active === 'daily' ? dailyF.err : active === 'monthly' ? monthlyF.err : active === 'person' ? null : anaF.err

  // แปลงข้อมูล API -> Table (ใช้ทั้งตัวอย่างและส่งออก) — ไม่มีคอลัมน์ขาดงาน
  const table = useMemo<Table | null>(() => {
    if (active === 'daily') {
      if (!dailyF.data) return null
      return {
        title: 'รายงานสรุปการเข้า-ออกงานประจำวัน',
        headers: ['วันที่', 'ชื่อ-สกุล', 'แผนก', 'เวร', 'เข้า', 'ออก', 'สถานะ'],
        rows: dailyF.data.rows.map((r) => [thShort(r.date), r.name, deptName(r.dept), dash(r.shift), dash(r.in), dash(r.out), dash(r.status)]),
      }
    }
    if (active === 'monthly') {
      if (!monthlyF.data) return null
      return {
        title: 'รายงานสรุปการเข้า-ออกงานประจำเดือน',
        headers: ['ชื่อ-สกุล', 'แผนก', 'วันที่มา', 'มาสาย', 'ออกก่อน', 'ลืมลงเวลาออก', 'นอกพื้นที่'],
        rows: monthlyF.data.rows.map((r) => [r.name, deptName(r.dept), r.present, r.late, r.early, r.no_out, r.out_area]),
      }
    }
    if (!anaF.data) return null
    if (active === 'late') {
      return {
        title: 'รายงานการมาสาย-ออกก่อน',
        headers: ['ประเภท', 'วันที่', 'ชื่อ-สกุล', 'แผนก', 'เวร', 'เวลา', 'นาที'],
        rows: [
          ...anaF.data.late_rows.map((r) => ['มาสาย', thShort(r.date), r.name, deptName(r.dept), dash(r.shift), dash(r.in), r.min] as (string | number)[]),
          ...anaF.data.early_rows.map((r) => ['ออกก่อน', thShort(r.date), r.name, deptName(r.dept), dash(r.shift), dash(r.out), r.min] as (string | number)[]),
        ],
      }
    }
    if (active === 'dept') {
      return {
        title: 'รายงานสรุปตามแผนก',
        headers: ['แผนก', 'พนักงาน', 'มาทำงาน', 'มาสาย', 'ออกก่อน', 'ลืมลงเวลาออก', 'อัตรามาทำงาน'],
        rows: anaF.data.depts.map((r) => [deptName(r.dept), r.staff, r.present, r.late, r.early, r.no_out, r.rate == null ? '—' : `${r.rate.toFixed(1)}%`]),
      }
    }
    if (active === 'shift') {
      return {
        title: 'รายงานสรุปตามเวร',
        headers: ['เวร', 'ลงเวลา (คน)', 'มาสาย', 'ออกก่อน', 'เวลาเข้าเฉลี่ย'],
        rows: anaF.data.shifts.map((r) => [dash(r.name), r.persons, r.late, r.early, dash(r.avg_in)]),
      }
    }
    return null
  }, [active, dailyF.data, monthlyF.data, anaF.data])

  // ตัวอย่างแบ่งหน้า (ส่งออกไฟล์ยังได้ครบทุกแถว) — เปลี่ยนรายงาน/ตัวกรอง = กลับหน้าแรก
  const paged = usePaged(table?.rows ?? [])
  useEffect(() => { paged.setPage(0) }, [active, from, to, month, fShifts, fDepts, hcode]) // eslint-disable-line react-hooks/exhaustive-deps

  // คอลัมน์แบบไดนามิก — หัวตาราง/ชนิดค่าเปลี่ยนตามรายงานที่เลือก
  const cols: Column<(string | number)[]>[] = table ? table.headers.map((h, j): Column<(string | number)[]> => ({
    key: `c${j}`,
    header: h,
    thStyle: { padding: 'var(--sp-3) var(--sp-4)', color: 'var(--bg)', whiteSpace: 'nowrap' },
    tdStyle: (r) => ({
      padding: 'var(--sp-3) var(--sp-4)',
      fontFamily: typeof r[j] === 'number' ? 'var(--mono)' : undefined,
      color: j === 0 ? 'var(--text)' : 'var(--table-row-text)',
      fontWeight: j === 0 ? 500 : 400,
      whiteSpace: 'nowrap',
    }),
    cell: (r) => (typeof r[j] === 'number' ? nf(r[j] as number) : r[j]),
  })) : []

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) {
    return <div className="max-w-(--page-max) text-body text-text-dim">ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div>
  }

  const activeLabel = REPORTS.find((r) => r.key === active)!.label
  const periodLabel = active === 'monthly'
    ? `ประจำเดือน ${monthTH(month)}`
    : from === to ? `ประจำวันที่ ${thShort(from)}` : `ช่วง ${thShort(from)} – ${thShort(to)}`
  const hospLabel = session?.hospitals.find((h) => h.value === hcode)?.label || hcode
  const subtitle = `${hospLabel} · ${periodLabel}`
  const canExport = !!table && table.rows.length > 0 && !loading && !exporting

  const doExport = async (kind: 'pdf' | 'xlsx' | 'csv' | 'print') => {
    if (!table || !canExport) return
    setExporting(kind); setExpErr(null)
    try {
      if (kind === 'csv') exportCSV(table)
      else if (kind === 'xlsx') await exportXLSX(table)
      else if (kind === 'pdf') await exportPDF(table, subtitle)
      else printTable(table, subtitle)
    } catch (e: any) {
      setExpErr(e?.message || 'ส่งออกไม่สำเร็จ')
    } finally {
      setExporting('')
    }
  }

  // ป้ายมุมขวาหัวแผง — ตัวกรองที่ใช้อยู่ทั้งหมด
  const shiftLabel = selLabel(shiftOpts, fShifts, 'ทุกเวร', 'เวร')
  const deptLabel = selLabel(deptOpts, fDepts, 'ทุกแผนก', 'แผนก')
  const filterMeta = [periodLabel, shiftLabel, deptLabel].join(' · ')

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        {/* ภาพประกอบส่งออกไฟล์ (Figma node 114:36843) */}
        <img src={asset("/hero-report.svg")} alt="" aria-hidden width={230} height={230}
          className="hide-sm pointer-events-none select-none"
          style={{ position: 'absolute', right: 8, bottom: -12 }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">รายงาน</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              สร้างรายงานและส่งออกข้อมูลสำหรับการวิเคราะห์
            </p>
          </div>
          <span className="inline-flex gap-2 items-center flex-wrap">
            <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
              icon={<Icon name="recon" size={20} style={loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
              รีเฟรช
            </Button>
            {/* รายงานประจำเดือนเลือกเป็นเดือน ที่เหลือเลือกเป็นช่วงวัน */}
            {active === 'monthly' ? (
              <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="เลือกเดือน">
                <MonthPicker bare value={month} max={thisMonth()} onChange={setMonth} />
              </FilterChip>
            ) : (
              <FilterChip icon={<Icon name="calendar-week" size={24} width={1.8} />} label="ช่วงวันที่">
                {/* backend รับช่วงยาวสุด 31 วัน — ล็อกขอบให้เลือกเกินไม่ได้ */}
                <DateRangePicker bare from={from} to={to} max={localISO()}
                  onFrom={(v) => setFrom(v < isoAddDays(to, -30) ? isoAddDays(to, -30) : v)}
                  onTo={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
              </FilterChip>
            )}
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
          </span>
        </div>

        <div className="relative mt-4 max-w-90">
          <StatCard tone="accent" layout="row" label="เทมเพลต" unit="ไฟล์"
            icon={<Icon name="report" size={24} color="currentColor" />}
            value={nf(REPORTS.length)} />
        </div>
      </div>

      {/* ---------- เทมเพลต + ตัวอย่างรายงาน ---------- */}
      <SectionPanel
        title="เทมเพลต"
        meta={filterMeta}
        actions={<DownloadMenu disabled={!canExport} busy={exporting} onPick={doExport} />}
        bodyPadding={false}
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', padding: 'var(--sp-4)' }}>
          {/* รายการเทมเพลต */}
          {/* รายการเทมเพลตติดหนึบใต้ Topbar ตอนเลื่อนดูตารางยาว ๆ */}
          <div className="rounded-xl" style={{
            border: '1px solid var(--control-border)', padding: 'var(--sp-2)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
            position: 'sticky', top: 'calc(var(--topbar-h) + var(--sp-4))', alignSelf: 'start',
          }}>
            {REPORTS.map((r) => (
              <Button key={r.key} variant="ghost" size="md" align="start" fullWidth radius="lg"
                active={active === r.key} ariaCurrent={active === r.key || undefined}
                onClick={() => setActive(r.key)}
                icon={<Icon name="report" size={20} width={1.8} />}>
                {r.label}
              </Button>
            ))}
          </div>

          {/* ตัวอย่างรายงาน */}
          <div className="rounded-xl" style={{ border: '1px solid var(--control-border)', padding: 'var(--sp-4)', minWidth: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
              <div style={{ ...TEXT.h3, color: 'var(--text)' }}>{activeLabel}</div>
              <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 'var(--sp-1)' }}>
                {active === 'person' ? hospLabel : subtitle}
              </div>
            </div>

            {active === 'person' ? (
              <div style={{ ...TEXT.body, padding: '30px 24px', textAlign: 'center', color: 'var(--text-dim)', lineHeight: 1.7 }}>
                รายงานสถิติการทำงานรายบุคคลดูได้ที่เมนู <b>"รายบุคคล"</b><br />
                เลือกพนักงานเพื่อดูโปรไฟล์ สรุปช่วงเวลา และประวัติการลงเวลาแบบละเอียด
              </div>
            ) : err ? (
              <div className="text-body text-danger" style={{ padding: 'var(--sp-4)' }}>ผิดพลาด: {err}</div>
            ) : !table ? (
              <Loading />
            ) : (
              <>
                <div className="table-rounded rounded-lg" style={{ border: '1px solid var(--control-border)' }}>
                  <DataTable
                    columns={cols} rows={paged.pageRows} rowKey={(_r, i) => String(i)}
                    minWidth={640}
                    // หัวตารางพื้นน้ำเงินเข้ม ตัวอักษรขาว ตาม Figma
                    theadRowStyle={{ background: 'var(--table-head-dark)' }}
                    empty="ไม่มีข้อมูลในช่วงที่เลือก"
                    emptyStyle={{ ...TEXT.body, padding: '28px 20px', textAlign: 'center', color: 'var(--text-dim)' }}
                  />
                </div>
                {table.rows.length > PAGE_SIZE && (
                  <Pagination page={paged.page} pageSize={PAGE_SIZE} total={paged.total}
                    shown={paged.pageRows.length} onPage={paged.setPage} />
                )}
                <p className="text-sm-fig mt-3 mb-0 text-text-dim">
                  ตัวอย่างแสดงทีละ {PAGE_SIZE} แถว — ไฟล์ที่ดาวน์โหลดได้ครบทุกแถว
                </p>
              </>
            )}
            {expErr && <div className="text-body text-danger" style={{ marginTop: 'var(--sp-3)' }}>ส่งออกไม่สำเร็จ: {expErr}</div>}
          </div>
        </div>
      </SectionPanel>
    </div>
  )
}
