import { useEffect, useMemo, useState } from 'react'
import { nf, useFetch } from '../hooks'
import { Pager, usePaged } from '../components/Pager'
import { filterQS, isoAddDays, localISO, ShiftDeptFilters, useAttFilterOptions } from '../components/AttFilters'
import { DatePicker, MonthPicker, thShort } from '../components/DatePicker'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { RefreshButton } from '../components/RefreshButton'
import { exportCSV, exportPDF, exportXLSX, printTable, type Table } from '../utils/exportx'
import { useApp } from '../state'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '8px 10px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.3px', background: 'var(--surface-card)' }

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

const fileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
  </svg>
)

// ปุ่มส่งออก — hover เปลี่ยนสีตามชนิดไฟล์ (ตามดีไซน์)
function ExpBtn({ label, tone, onClick, disabled, busy }: {
  label: string
  tone: string
  onClick: () => void
  disabled: boolean
  busy?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = tone; e.currentTarget.style.color = tone } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '8px 13px',
        borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-card)', color: 'var(--text)',
        fontFamily: 'var(--sans)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1, whiteSpace: 'nowrap',
      }}>
      {busy ? 'กำลังส่งออก…' : label}
    </button>
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

  // แปลงข้อมูล API -> Table (ใช้ทั้ง preview และส่งออก) — ไม่มีคอลัมน์ขาดงาน
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

  // preview แบ่งหน้า 20 (ส่งออกไฟล์ยังได้ครบทุกแถว) — เปลี่ยนรายงาน/ตัวกรอง = กลับหน้าแรก
  const paged = usePaged(table?.rows ?? [])
  useEffect(() => { paged.setPage(0) }, [active, from, to, month, fShifts, fDepts, hcode]) // eslint-disable-line react-hooks/exhaustive-deps

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) return <div style={{ maxWidth: 'var(--page-max)' }}><div style={{ ...card, padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div></div>

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>สร้างรายงานและส่งออกข้อมูลสำหรับการวิเคราะห์</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {active === 'monthly'
            ? <MonthPicker value={month} max={thisMonth()} onChange={setMonth} />
            : <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <DatePicker value={from} min={isoAddDays(to, -30)} max={to} onChange={setFrom} />
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
                <DatePicker value={to} min={from} max={localISO()}
              onChange={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
              </span>}
          <ShiftDeptFilters shiftOpts={shiftOpts} deptOpts={deptOpts}
            shifts={fShifts} depts={fDepts} onShifts={setFShifts} onDepts={setFDepts} />
          {(fShifts.length > 0 || fDepts.length > 0) && (
            <button onClick={() => { setFShifts([]); setFDepts([]) }}
              style={{ fontSize: 11.5, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', textDecoration: 'underline' }}>ล้างตัวกรอง</button>
          )}
          <RefreshButton busy={loading} onClick={() => setReload((r) => r + 1)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* รายการรายงานสำเร็จรูป */}
        <div style={{ ...card, overflow: 'hidden', flex: '1 1 260px', minWidth: 'min(260px, 100%)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700 }}>รายงานสำเร็จรูป</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {REPORTS.map((r, i) => {
              const on = active === r.key
              return (
                <button key={r.key} onClick={() => setActive(r.key)}
                  style={{
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 18px',
                    border: 'none', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer',
                    fontFamily: 'var(--sans)', fontSize: 13,
                    background: on ? 'var(--surface-card)' : 'transparent',
                    color: on ? 'var(--text)' : 'var(--text-dim)', fontWeight: on ? 700 : 500,
                    boxShadow: on ? 'inset 3px 0 0 var(--accent)' : 'none',
                  }}>
                  {fileIcon}{r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* preview รายงานที่เลือก + ปุ่มส่งออก */}
        <div style={{ ...card, overflow: 'hidden', flex: '2.4 1 380px', minWidth: 'min(380px, 100%)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{activeLabel}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{active === 'person' ? hospLabel : subtitle}</div>
          </div>

          {active === 'person' ? (
            <div style={{ padding: '30px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              รายงานสถิติการทำงานรายบุคคลดูได้ที่แท็บ <b>"รายบุคคล"</b><br />
              เลือกพนักงานเพื่อดูโปรไฟล์ สรุปช่วงเวลา และประวัติการลงเวลาแบบละเอียด
            </div>
          ) : err ? (
            <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>
          ) : !table ? (
            <Loading />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
                  <thead><tr style={theadTr}>
                    <th style={{ ...th, paddingLeft: 16, textAlign: 'right', width: 56 }}>ลำดับ</th>
                    {table.headers.map((h, i) => (
                      <th key={h} style={{ ...th, paddingRight: i === table.headers.length - 1 ? 16 : undefined }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {paged.pageRows.map((r, i) => (
                      <tr key={i} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ ...td, paddingLeft: 16, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11 }}>{nf(paged.offset + i + 1)}</td>
                        {r.map((c, j) => (
                          <td key={j} style={{
                            ...td,
                            paddingLeft: j === 0 ? 16 : undefined, paddingRight: j === r.length - 1 ? 16 : undefined,
                            fontFamily: typeof c === 'number' ? 'var(--mono)' : undefined,
                            textAlign: typeof c === 'number' ? 'center' : 'left',
                            color: j === 0 ? undefined : 'var(--text-dim)',
                            fontWeight: j === 0 ? 600 : 400,
                          }}>{typeof c === 'number' ? nf(c) : c}</td>
                        ))}
                      </tr>
                    ))}
                    {table.rows.length === 0 && (
                      <tr><td colSpan={table.headers.length + 1} style={{ ...td, padding: '18px 16px', textAlign: 'center', color: 'var(--text-faint)' }}>ไม่มีข้อมูลในช่วงที่เลือก</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {table.rows.length > 0 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>ส่งออกไฟล์ได้ครบทุกแถว</span>
                  <Pager page={paged.page} total={paged.total} onPage={paged.setPage} />
                </div>
              )}
            </>
          )}

          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>ส่งออกข้อมูล</div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
              <ExpBtn label="PDF" tone="var(--danger)" onClick={() => doExport('pdf')} disabled={!canExport} busy={exporting === 'pdf'} />
              <ExpBtn label="Excel" tone="var(--ok)" onClick={() => doExport('xlsx')} disabled={!canExport} busy={exporting === 'xlsx'} />
              <ExpBtn label="CSV" tone="var(--accent)" onClick={() => doExport('csv')} disabled={!canExport} busy={exporting === 'csv'} />
              <ExpBtn label="Print" tone="var(--info)" onClick={() => doExport('print')} disabled={!canExport} busy={exporting === 'print'} />
              {expErr && <span style={{ fontSize: 12, color: 'var(--danger)' }}>ส่งออกไม่สำเร็จ: {expErr}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
