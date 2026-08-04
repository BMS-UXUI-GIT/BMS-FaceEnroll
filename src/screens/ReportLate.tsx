import { useEffect, useMemo, useState } from 'react'
import { nf, useFetch } from '../hooks'
import { filterQS, isoAddDays, localISO, ShiftDeptFilters, useAttFilterOptions } from '../components/AttFilters'
import { DatePicker, thShort } from '../components/DatePicker'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { RefreshButton } from '../components/RefreshButton'
import { exportCSV, type Table } from '../utils/exportx'
import { Pager, PAGE_SIZE } from '../components/Pager'
import { useApp } from '../state'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '9px 8px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '10px 8px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', background: 'var(--surface-card)' }

type Analytics = {
  late_total: number   // จำนวนจริงทั้งหมด (late_rows โดนตัดที่ 300 แถว)
  early_total: number
  late_rows: { emp: string; name: string; dept: string; date: string; shift: string; in: string; min: number }[]
  early_rows: { emp: string; name: string; dept: string; date: string; shift: string; out: string; min: number }[]
}

// แถวแสดงผลร่วมของ 2 การ์ด (time = เวลาเข้า/ออก แล้วแต่ฝั่ง)
type IssueRow = { name: string; dept: string; date: string; shift: string; time: string; min: number }

const deptName = (d?: string) => (d && d.trim() !== '' ? d : 'ไม่ระบุแผนก')
const dash = (v?: string) => (v && v.trim() !== '' ? v : '—')

function IssueCard({ title, dayLabel, color, rows, total, timeHead, minHead, multiDay, ready, loading, csvTitle, emptyText, page, onPage }: {
  title: string
  dayLabel: string
  color: string
  rows: IssueRow[]
  total: number // จำนวนจริงทั้งหมด (rows = เฉพาะหน้าที่ขอ)
  timeHead: string
  minHead: string
  multiDay: boolean
  ready: boolean
  loading: boolean
  csvTitle: string
  emptyText: string
  page: number
  onPage: (p: number) => void
}) {
  const cols = multiDay ? 7 : 6
  const doCSV = () => {
    const t: Table = {
      title: csvTitle,
      headers: ['วันที่', 'ชื่อ-สกุล', 'แผนก', 'เวร', timeHead, `${minHead} (นาที)`],
      rows: rows.map((r) => [r.date, r.name, deptName(r.dept), dash(r.shift), dash(r.time), r.min]),
    }
    exportCSV(t)
  }
  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{title} · {dayLabel}</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color, marginTop: 2 }}>
            {ready ? nf(total) : '—'} <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>{multiDay ? 'รายการ' : 'คน'}</span>
          </div>
        </div>
        <button onClick={doCSV} disabled={rows.length === 0}
          style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', fontFamily: 'var(--sans)', cursor: rows.length === 0 ? 'default' : 'pointer', opacity: rows.length === 0 ? 0.55 : 1, whiteSpace: 'nowrap' }}>
          Export CSV
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: multiDay ? 580 : 500 }}>
          <thead><tr style={theadTr}>
            <th style={{ ...th, padding: '9px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th>
            <th style={th}>ชื่อ-สกุล</th>
            <th style={th}>แผนก</th>
            {multiDay && <th style={th}>วันที่</th>}
            <th style={th}>เวร</th>
            <th style={th}>{timeHead}</th>
            <th style={{ ...th, padding: '9px 20px', textAlign: 'right' }}>{minHead} (นาที)</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ ...td, padding: '10px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11.5 }}>{nf(page * PAGE_SIZE + i + 1)}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...td, color: 'var(--text-dim)' }}>{deptName(r.dept)}</td>
                {multiDay && <td style={{ ...td, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>{thShort(r.date)}</td>}
                <td style={{ ...td, color: 'var(--text-dim)' }}>{dash(r.shift)}</td>
                <td style={{ ...td, fontFamily: 'var(--mono)' }}>{dash(r.time)}</td>
                <td style={{ ...td, padding: '10px 20px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color }}>{nf(r.min)}</td>
              </tr>
            ))}
            {ready && rows.length === 0 && (
              <tr><td colSpan={cols} style={{ ...td, padding: '18px 20px', textAlign: 'center', color: 'var(--ok)' }}>{emptyText}</td></tr>
            )}
            {!ready && loading && <tr><td colSpan={cols} style={{ padding: 0 }}><Loading /></td></tr>}
          </tbody>
        </table>
      </div>
      {total > PAGE_SIZE && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <Pager page={page} total={total} onPage={onPage} />
        </div>
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
  const [fShifts, setFShifts] = useState<string[]>([])
  const [fDepts, setFDepts] = useState<string[]>([])
  const [latePage, setLatePage] = useState(0)
  const [earlyPage, setEarlyPage] = useState(0)
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)

  // สลับโรง / เปลี่ยนช่วงวัน-ตัวกรอง = ล้างตัวกรอง + กลับหน้าแรกทั้งสองตาราง
  useEffect(() => { setFShifts([]); setFDepts([]); setFrom(localISO()); setTo(localISO()) }, [hcode])
  useEffect(() => { setLatePage(0); setEarlyPage(0) }, [from, to, fShifts, fDepts, hcode])

  const fq = filterQS(fShifts, fDepts)
  // แบ่งหน้าฝั่งเซิร์ฟเวอร์ — 2 ตารางแยกหน้ากันด้วย late_offset/early_offset (analytics ครั้งเดียวคืนทั้งคู่)
  const anaF = useFetch<Analytics>(hcode
    ? `/admin/attendance/analytics?hcode=${encodeURIComponent(hcode)}&date_from=${from}&date_to=${to}${fq}`
      + `&limit=${PAGE_SIZE}&late_offset=${latePage * PAGE_SIZE}&early_offset=${earlyPage * PAGE_SIZE}`
    : null, reload)

  const lateRows = useMemo<IssueRow[]>(
    () => (anaF.data?.late_rows ?? []).map((r) => ({ name: r.name, dept: r.dept, date: r.date, shift: r.shift, time: r.in, min: r.min })),
    [anaF.data])
  const earlyRows = useMemo<IssueRow[]>(
    () => (anaF.data?.early_rows ?? []).map((r) => ({ name: r.name, dept: r.dept, date: r.date, shift: r.shift, time: r.out, min: r.min })),
    [anaF.data])

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) return <div style={{ maxWidth: 'var(--page-max)' }}><div style={{ ...card, padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div></div>

  const multiDay = from !== to
  const isToday = !multiDay && to === localISO()
  const dayLabel = isToday ? 'วันนี้' : multiDay ? `${thShort(from)} – ${thShort(to)}` : thShort(to)
  const ready = !!anaF.data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>ติดตามพนักงานที่มาสายหรือออกก่อนเวลาที่กำหนด</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {/* backend รับช่วงยาวสุด 31 วัน — ล็อกขอบให้เลือกเกินไม่ได้ */}
            <DatePicker value={from} min={isoAddDays(to, -30)} max={to} onChange={setFrom} />
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
            <DatePicker value={to} min={from} max={localISO()}
              onChange={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
          </span>
          <ShiftDeptFilters shiftOpts={shiftOpts} deptOpts={deptOpts}
            shifts={fShifts} depts={fDepts} onShifts={setFShifts} onDepts={setFDepts} />
          {(fShifts.length > 0 || fDepts.length > 0) && (
            <button onClick={() => { setFShifts([]); setFDepts([]) }}
              style={{ fontSize: 11.5, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', textDecoration: 'underline' }}>ล้างตัวกรอง</button>
          )}
          <RefreshButton busy={anaF.loading} onClick={() => setReload((r) => r + 1)} />
        </div>
      </div>

      {anaF.err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {anaF.err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(430px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
        <IssueCard title="มาสาย" dayLabel={dayLabel} color="var(--warn)" rows={lateRows}
          total={anaF.data?.late_total ?? lateRows.length} page={latePage} onPage={setLatePage}
          timeHead="เข้า" minHead="สาย" multiDay={multiDay} ready={ready} loading={anaF.loading}
          csvTitle="รายงานมาสาย" emptyText="ไม่มีคนมาสายในช่วงที่เลือก" />
        <IssueCard title="ออกก่อนเวลา" dayLabel={dayLabel} color="var(--accent)" rows={earlyRows}
          total={anaF.data?.early_total ?? earlyRows.length} page={earlyPage} onPage={setEarlyPage}
          timeHead="ออก" minHead="ก่อน" multiDay={multiDay} ready={ready} loading={anaF.loading}
          csvTitle="รายงานออกก่อนเวลา" emptyText="ไม่มีคนออกก่อนเวลาในช่วงที่เลือก" />
      </div>

      <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--surface)' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
          <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" />
        </svg>
        เกณฑ์: สาย = ลงเวลาเข้าหลังเวลาเริ่มเวร · ออกก่อน = ลงเวลาออกก่อนเวลาเลิกเวร
      </div>
    </div>
  )
}
