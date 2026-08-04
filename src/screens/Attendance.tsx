import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { dialog } from '../components/dialog'
import { nf, useFetch, useServerPage } from '../hooks'
import { daysAgoISO, filterQS, localISO, ShiftDeptFilters, useAttFilterOptions } from '../components/AttFilters'
import { DatePicker, MonthPicker } from '../components/DatePicker'
import { Loading } from '../components/Spinner'
import { Pager, PAGE_SIZE, SearchInput, usePaged } from '../components/Pager'
import { PickHospital } from '../components/PickHospital'
import { RefreshButton } from '../components/RefreshButton'
import { ScanMap, type Fence, type ScanPoint } from '../components/ScanMap'
import { Icon } from '../icons'
import { useApp } from '../state'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '11px 12px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-2)' }

type DailyRow = {
  emp: string; name: string; dept?: string; date: string; in: string; out: string; shift: string
  seq?: number // ลำดับรอบเวรในวันนั้น (ควบเวร = หลายรอบ)
  gps: boolean; coords: ScanPoint[]
  late: boolean; early: boolean; no_out: boolean; out_area: boolean | null
  late_min: number; early_min: number
  dist_m: number | null
  status: string
  // ชื่อสถานะที่โรงบันทึกไว้ตอนสแกน ('' = โรงยังไม่เก็บสถานะ → ระบบคำนวณเอง)
  status_in?: string; status_out?: string
}
type Daily = {
  summary: { date: string; punched: number; done: number; open: number; late: number; early: number; out_area: number }
  rows: DailyRow[]
  total: number
  fences: Fence[]
}
type LateRow = { emp: string; name: string; dept?: string; date: string; shift: string; io: string; issue: string; seq?: number }
type Timesheet = { from: string; to: string; rows: LateRow[]; total: number }
type MonthlyRow = { emp: string; name: string; dept?: string; present: number; late: number; early: number; no_out: number; out_area: number }
type Monthly = { month: string; days_counted: number; rows: MonthlyRow[]; total: number }
type EmpHist = {
  emp_id: string; name: string; days: number
  stat: { present: number; late: number; early: number; no_out: number; out_area: number }
  rows: { date: string; seq?: number; in: string; out: string; shift: string; late: boolean; early: boolean; late_min?: number; early_min?: number; no_out: boolean; out_area: boolean | null; dist_m: number | null }[]
}
type Tab = 'daily' | 'sheet' | 'monthly'

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: [Tab, string][] = [['daily', 'รายวัน'], ['sheet', 'รายงานผิดปกติ'], ['monthly', 'รายเดือน']]
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 11, border: '1px solid var(--border)' }}>
      {items.map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)} style={{
          padding: '7px 15px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
          fontWeight: tab === id ? 600 : 500, background: tab === id ? 'var(--surface)' : 'transparent',
          color: tab === id ? 'var(--text)' : 'var(--text-dim)', boxShadow: tab === id ? 'var(--shadow)' : 'none',
        }}>{label}</button>
      ))}
    </div>
  )
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: wide ? 760 : 560, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

// badge สถานะ (ชุดเดียวทั้งหน้า)
function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${m} ม.`
}

function IssueBadges({ r }: { r: { late: boolean; early: boolean; no_out: boolean; out_area: boolean | null; dist_m?: number | null; late_min?: number; early_min?: number } }) {
  const items: [boolean, string, string][] = [
    [r.late, r.late_min ? `สาย ${nf(r.late_min)} นาที` : 'สาย', 'var(--warn)'],
    [r.early, r.early_min ? `ออกก่อน ${nf(r.early_min)} นาที` : 'ออกก่อน', 'var(--warn)'],
    [r.no_out, 'ยังไม่ออกเวร', 'var(--info)'],
    [r.out_area === true, r.dist_m != null ? `นอกพื้นที่ ${fmtDist(r.dist_m)}` : 'นอกพื้นที่', 'var(--danger)'],
  ]
  const on = items.filter(([v]) => v)
  if (on.length === 0) return <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: 'var(--ok)', background: 'var(--ok-soft)' }}>ปกติ</span>
  return (
    <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {on.map(([, label, color]) => (
        <span key={label} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>{label}</span>
      ))}
    </span>
  )
}

// modal รายละเอียดการลงเวลา + แผนที่จุดสแกน
function PunchModal({ row, fences, date, onClose }: { row: DailyRow; fences: Fence[]; date: string; onClose: () => void }) {
  return (
    <Modal title={`${row.name} · ${date}`} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {[['เข้าเวร', row.in], ['ออกเวร', row.out], ['เวร', row.shift], ['สถานะ', '']].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{l}</div>
            {v !== '' ? <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', marginTop: 3 }}>{v}</div>
              : <div style={{ marginTop: 5 }}><IssueBadges r={row} /></div>}
          </div>
        ))}
      </div>
      {/* สถานะที่โรงบันทึกไว้ตอนสแกน (โรงที่เปิดเก็บสถานะ) — แช่ความจริง ณ วันนั้น */}
      {(row.status_in || row.status_out) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14, fontSize: 12.5, color: 'var(--text-dim)' }}>
          <span>สถานะที่บันทึกไว้:</span>
          {row.status_in && <span><b style={{ color: 'var(--text)' }}>เข้า</b> {row.status_in}{row.late_min ? ` (${nf(row.late_min)} นาที)` : ''}</span>}
          {row.status_out && <span><b style={{ color: 'var(--text)' }}>ออก</b> {row.status_out}{row.early_min ? ` (${nf(row.early_min)} นาที)` : ''}</span>}
        </div>
      )}
      {row.coords.length > 0 ? (
        <>
          <ScanMap fences={fences} points={row.coords} height={330} />
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>
            หมุด = จุดที่สแกนจริง (เขียว = ในพื้นที่ · แดง = นอกพื้นที่) · วงกลม = จุดลงเวลาที่โรงกำหนด
          </div>
        </>
      ) : (
        <div style={{ padding: '18px 0', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center' }}>รายการนี้ไม่มีพิกัด GPS</div>
      )}
    </Modal>
  )
}

// modal ประวัติรายคน (drill-down)
function EmployeeModal({ hcode, empId, onClose }: { hcode: string; empId: string; onClose: () => void }) {
  const { session } = useApp()
  const hist = useFetch<EmpHist>(`/admin/attendance/employee?hcode=${encodeURIComponent(hcode)}&emp_id=${encodeURIComponent(empId)}&days=30`)
  const s = hist.data?.stat
  const paged = usePaged(hist.data?.rows ?? [])
  const [unlock, setUnlock] = useState<'idle' | 'busy' | 'done'>('idle')
  const [unlockErr, setUnlockErr] = useState<string | null>(null)
  const doUnlock = async () => {
    if (unlock === 'busy') return
    if (!(await dialog.confirm({ title: 'ปลดล็อคแอป', body: 'ปลดล็อคแอปให้พนักงานคนนี้? แอปจะปลดล็อคครั้งถัดไปที่เปิด', confirmText: 'ปลดล็อค' }))) return
    setUnlock('busy'); setUnlockErr(null)
    try { await api.post(`/admin/emp/${hcode}/${encodeURIComponent(empId)}/unlock-pin`, {}); setUnlock('done') }
    catch (e: any) { setUnlock('idle'); setUnlockErr(e?.message || 'ปลดล็อคไม่สำเร็จ') }
  }
  return (
    <Modal title={hist.data ? `${hist.data.name} · ย้อนหลัง 30 วัน` : 'กำลังโหลด…'} onClose={onClose} wide>
      {hist.err && <div style={{ color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {hist.err}</div>}
      {hist.loading && <Loading text="กำลังโหลด… (ดึงทีละวัน อาจใช้เวลาครู่หนึ่ง)" />}
      {s && (
        <>
          {session?.role !== 'user' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>🔒 แอปคนนี้ถูกล็อคด้วย PIN อยู่? ปลดล็อคให้ได้ที่นี่</span>
              {unlock === 'done'
                ? <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ok)' }}>ส่งคำสั่งปลดล็อคแล้ว ✓</span>
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {unlockErr && <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>{unlockErr}</span>}
                    <button onClick={doUnlock} disabled={unlock === 'busy'} style={{ fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--warn)', background: 'var(--warn-soft)', color: 'var(--warn)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{unlock === 'busy' ? 'กำลังปลดล็อค…' : 'ปลดล็อคแอป'}</button>
                  </span>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
            {([['มาทำงาน', s.present, 'var(--ok)'], ['สาย', s.late, 'var(--warn)'], ['ออกก่อน', s.early, 'var(--warn)'], ['ลืมลงเวลาออก', s.no_out, 'var(--info)'], ['นอกพื้นที่', s.out_area, 'var(--danger)']] as const).map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={theadTr}><th style={{ ...th, textAlign: 'right', width: 56 }}>ลำดับ</th><th style={th}>วันที่</th><th style={th}>เข้าเวร</th><th style={th}>ออกเวร</th><th style={th}>เวร</th><th style={{ ...th, textAlign: 'right' }}>สถานะ</th></tr></thead>
            <tbody>
              {paged.pageRows.map((r, i) => (
                <tr key={`${r.date}:${r.seq ?? 0}`} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(paged.offset + i + 1)}</td>
                  <td style={{ ...td, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{r.date}</td>
                  <td style={{ ...td, fontFamily: 'var(--mono)', color: r.late ? 'var(--warn)' : 'var(--ok)' }}>{r.in}</td>
                  <td style={{ ...td, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{r.out}</td>
                  <td style={{ ...td, color: 'var(--text-dim)' }}>{r.shift}</td>
                  <td style={{ ...td, textAlign: 'right' }}><IssueBadges r={r} /></td>
                </tr>
              ))}
              {hist.data!.rows.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-faint)' }}>ไม่มีการลงเวลาในช่วงนี้</td></tr>}
            </tbody>
          </table>
          {hist.data!.rows.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Pager page={paged.page} total={paged.total} onPage={paged.setPage} /></div>
          )}
        </>
      )}
    </Modal>
  )
}

const SUMMARY = [
  { key: 'punched', label: 'ลงเวลา', color: 'var(--info)' },
  { key: 'open', label: 'ยังไม่ออกเวร', color: 'var(--warn)' },
  { key: 'done', label: 'ครบเข้า-ออกเวร', color: 'var(--ok)' },
  { key: 'late', label: 'สาย', color: 'var(--danger)' },
] as const

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// แก้เวลาเข้า-ออกย้อนหลัง — เขียนกลับระบบโรงพยาบาลจริง + ลง audit
function FixTimeModal({ hcode, row, onClose, onSaved }: { hcode: string; row: LateRow; onClose: () => void; onSaved: () => void }) {
  const clean = (s?: string) => {
    const v = (s || '').replace('(+1)', '').trim()
    return v === '—' ? '' : v
  }
  const [orig] = useState(() => {
    const [a, b] = row.io.split(' / ')
    return { in: clean(a), out: clean(b) }
  })
  const [tin, setTin] = useState(orig.in)
  const [tout, setTout] = useState(orig.out)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const changedIn = !!tin && tin !== orig.in
  const changedOut = !!tout && tout !== orig.out

  const save = async () => {
    if (busy || (!changedIn && !changedOut)) return
    setBusy(true); setErr(null)
    try {
      await api.post('/admin/attendance/correction', {
        hcode, emp_id: row.emp, date: row.date,
        in_time: changedIn ? tin : null,
        out_time: changedOut ? tout : null,
        reason: reason.trim(),
        // ควบเวร = วันเดียวมีหลายรอบ — บอกให้ชัดว่าแก้รอบไหน และรอบนั้นยังเป็นเวลาเดิมอยู่ไหม
        seq: row.seq ?? 0,
        expect_in: orig.in || '—',
        expect_out: orig.out || '—',
      })
      onSaved()
    } catch (e: any) {
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
      setBusy(false)
    }
  }

  const fld: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none', width: 130 }
  const lb: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 5, display: 'block' }
  return (
    <Modal title={`แก้เวลา — ${row.name}`} onClose={onClose}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>วันที่ <b style={{ fontFamily: 'var(--mono)' }}>{row.date}</b></span>
          <span>เวร <b>{row.shift}</b></span>
          <span style={{ color: 'var(--danger)' }}>{row.issue}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={lb}>เวลาเข้า {orig.in && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(เดิม {orig.in})</span>}</label>
            <input type="time" value={tin} onChange={(e) => setTin(e.target.value)} style={fld} />
          </div>
          <div>
            <label style={lb}>เวลาออก {orig.out && <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(เดิม {orig.out})</span>}</label>
            <input type="time" value={tout} onChange={(e) => setTout(e.target.value)} style={fld} />
          </div>
        </div>
        <div>
          <label style={lb}>เหตุผลที่แก้ (ลงประวัติการจัดการ)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ลืมสแกนออก มีใบรับรองหัวหน้าเวร"
            style={{ ...fld, fontFamily: 'var(--sans)', width: '100%', fontSize: 13 }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5 }}>
          บันทึกแล้วจะแก้ข้อมูลเวลาในระบบโรงพยาบาลจริง และเก็บประวัติว่าใครแก้ อะไร เมื่อไหร่
        </div>
        {err && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>ผิดพลาด: {err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={save} disabled={busy || (!changedIn && !changedOut)}
            style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 18px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer', opacity: busy || (!changedIn && !changedOut) ? 0.6 : 1 }}>
            {busy ? 'กำลังบันทึก…' : 'บันทึกเวลาใหม่'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function Attendance() {
  const { currentHcode, session } = useApp()
  const hcode = useMemo(() => (currentHcode === '*' ? '' : currentHcode), [currentHcode])
  const [tab, setTab] = useState<Tab>('daily')
  const [reload, setReload] = useState(0)
  const [month, setMonth] = useState(thisMonth())
  const [punchRow, setPunchRow] = useState<DailyRow | null>(null)
  const [empId, setEmpId] = useState<string | null>(null)
  const [fixRow, setFixRow] = useState<LateRow | null>(null)
  const [search, setSearch] = useState('')
  // ตัวกรอง: ช่วงวัน (รายวัน + รายงานผิดปกติ) / เวร + แผนก (ทุกแท็บ)
  const [dFrom, setDFrom] = useState(localISO())
  const [dTo, setDTo] = useState(localISO())
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(localISO())
  const [fShifts, setFShifts] = useState<string[]>([])
  const [fDepts, setFDepts] = useState<string[]>([])
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)
  const q = `hcode=${encodeURIComponent(hcode)}`
  const fq = filterQS(fShifts, fDepts)
  const multiDay = dFrom !== dTo // รายวันดูหลายวัน = โชว์คอลัมน์วันที่

  useEffect(() => { setSearch('') }, [tab, hcode])
  // สลับโรง = ล้างตัวกรองทั้งหมด (เวรคนละชุด แผนกคนละชุด)
  useEffect(() => {
    setFShifts([]); setFDepts([]); setDFrom(localISO()); setDTo(localISO()); setFrom(daysAgoISO(6)); setTo(localISO())
  }, [hcode])

  // ค้นหาชื่อ/รหัส — หน่วง 300ms แล้วส่งให้ backend (ค้นข้ามทุกหน้า ไม่ใช่แค่หน้าปัจจุบัน)
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(search.trim()), 300); return () => clearTimeout(t) }, [search])
  const sq = dq ? `&q=${encodeURIComponent(dq)}` : ''

  // ดึงทีละหน้า (server-side) — limit/offset ต่อให้ใน useServerPage
  const daily = useServerPage<Daily>(hcode && tab === 'daily' ? `/admin/attendance/daily?${q}&date_from=${dFrom}&date_to=${dTo}${fq}${sq}` : null, reload)
  const sheet = useServerPage<Timesheet>(hcode && tab === 'sheet' ? `/admin/attendance/timesheet?${q}&date_from=${from}&date_to=${to}${fq}${sq}` : null, reload)
  const monthly = useServerPage<Monthly>(hcode && tab === 'monthly' ? `/admin/attendance/monthly?${q}&month=${month}${fq}${sq}` : null, reload)

  const dailyRows = daily.data?.rows ?? []
  const sheetRows = sheet.data?.rows ?? []
  const monthlyRows = monthly.data?.rows ?? []

  const [exporting, setExporting] = useState(false)
  const [expErr, setExpErr] = useState<string | null>(null)
  const exportCsv = async () => {
    if (exporting) return
    setExporting(true); setExpErr(null)
    try {
      if (tab === 'monthly') await api.download(`/admin/attendance/export-monthly?${q}&month=${month}${fq}`, `attendance_${hcode}_${month}.csv`)
      else await api.download(`/admin/attendance/export?${q}&date_from=${dFrom}&date_to=${dTo}${fq}`, `attendance_${hcode}_${dFrom}${multiDay ? `_${dTo}` : ''}.csv`)
    } catch (e: any) { setExpErr(e?.message || 'ดาวน์โหลดไม่สำเร็จ') }
    finally { setExporting(false) }
  }

  if (currentHcode === '*') return <PickHospital />
  if (!hcode) return <div style={{ maxWidth: 'var(--page-max)' }}><div style={{ ...card, padding: 20, color: 'var(--text-dim)', fontSize: 13 }}>ยังไม่มีโรงพยาบาลในสิทธิ์ของบัญชีนี้</div></div>

  const nameCell = (emp: string, name: string, dept?: string) => (
    <button onClick={() => setEmpId(emp)} title="ดูประวัติย้อนหลัง 30 วัน"
      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, padding: 0, color: 'var(--text)', textAlign: 'left' }}>
      <span style={{ fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'var(--border)', textUnderlineOffset: 3 }}>{name}</span>
      {session?.role !== 'user' && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)' }}> #{emp}</span>}
      {dept && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{dept}</div>}
    </button>
  )

  return (
    <div style={{ maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <Tabs tab={tab} setTab={setTab} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นชื่อ / emp_id…" width={150} />
          {tab === 'daily' && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <DatePicker value={dFrom} max={dTo} onChange={setDFrom} />
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
              <DatePicker value={dTo} min={dFrom} max={localISO()} onChange={setDTo} />
            </span>
          )}
          {tab === 'sheet' && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <DatePicker value={from} max={to} onChange={setFrom} />
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
              <DatePicker value={to} min={from} max={localISO()} onChange={setTo} />
            </span>
          )}
          {tab === 'monthly' && <MonthPicker value={month} max={thisMonth()} onChange={setMonth} />}
          <ShiftDeptFilters shiftOpts={shiftOpts} deptOpts={deptOpts}
            shifts={fShifts} depts={fDepts} onShifts={setFShifts} onDepts={setFDepts} />
          {(fShifts.length > 0 || fDepts.length > 0) && (
            <button onClick={() => { setFShifts([]); setFDepts([]) }}
              style={{ fontSize: 11.5, border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', textDecoration: 'underline' }}>ล้างตัวกรอง</button>
          )}
          <RefreshButton busy={tab === 'daily' ? daily.loading : tab === 'sheet' ? sheet.loading : monthly.loading} onClick={() => setReload((r) => r + 1)} />
          {tab !== 'sheet' && (
            <button onClick={exportCsv} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: exporting ? 'default' : 'pointer', opacity: exporting ? 0.7 : 1 }}>
              <Icon name="download" size={15} width={1.9} /> {exporting ? 'กำลังส่งออก…' : 'Export CSV'}
            </button>
          )}
        </div>
      </div>

      {expErr && <div style={{ ...card, padding: '11px 16px', marginBottom: 14, color: 'var(--danger)', fontSize: 13 }}>Export ไม่สำเร็จ: {expErr}</div>}

      {/* ---------- รายวัน ---------- */}
      {tab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 14 }}>
            {SUMMARY.map((s) => (
              <div key={s.key} style={{ ...card, padding: '17px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: s.color, marginTop: 8 }}>
                  {daily.data ? nf((daily.data.summary as any)[s.key]) : daily.loading ? '…' : '—'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
              <span>การลงเวลา <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>— คลิกชื่อดูประวัติรายคน · คลิกแถวดูจุดสแกน</span></span>
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                <Pager page={daily.page} total={daily.data?.total ?? 0} onPage={daily.setPage} />
                <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12.5 }}>{multiDay ? `${dFrom} – ${dTo}` : dFrom}</span>
              </span>
            </div>
            {daily.err && <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {daily.err}</div>}
            {!daily.err && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 780 }}>
                  <thead><tr style={theadTr}><th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th><th style={th}>พนักงาน</th>{multiDay && <th style={th}>วันที่</th>}<th style={th}>เข้าเวร</th><th style={th}>ออกเวร</th><th style={th}>เวร</th><th style={th}>GPS</th><th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}>สถานะ</th></tr></thead>
                  <tbody>
                    {dailyRows.map((r, i) => (
                      <tr key={`${r.emp}:${r.date}:${r.seq ?? 0}`} className="row-hover" style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setPunchRow(r)}>
                        <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }} onClick={(e) => e.stopPropagation()}>{nf(daily.page * PAGE_SIZE + i + 1)}</td>
                        <td style={{ ...td, padding: '11px 20px' }} onClick={(e) => e.stopPropagation()}>{nameCell(r.emp, r.name, r.dept)}</td>
                        {multiDay && <td style={{ ...td, fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 12 }}>{r.date}</td>}
                        <td style={{ ...td, fontFamily: 'var(--mono)', color: r.late ? 'var(--warn)' : 'var(--ok)', fontWeight: 600 }}>{r.in}</td>
                        <td style={{ ...td, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{r.out}</td>
                        <td style={{ ...td, color: 'var(--text-dim)' }}>{r.shift}</td>
                        <td style={td}>{r.gps
                          ? <span style={{ color: r.out_area ? 'var(--danger)' : 'var(--ok)' }}>● {r.out_area ? 'นอกพื้นที่' : 'มีพิกัด'}</span>
                          : <span style={{ color: 'var(--text-faint)' }}>— ไม่มี</span>}</td>
                        <td style={{ ...td, padding: '11px 20px', textAlign: 'right' }}><IssueBadges r={r} /></td>
                      </tr>
                    ))}
                    {daily.data && dailyRows.length === 0 && <tr><td colSpan={multiDay ? 8 : 7} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>{dq ? 'ไม่พบที่ตรงกับคำค้น' : 'ไม่มีการลงเวลาในช่วงที่เลือก'}</td></tr>}
                    {daily.loading && !daily.data && <tr><td colSpan={multiDay ? 8 : 7} style={{ padding: 0 }}><Loading /></td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- รายงานผิดปกติ (แก้เวลาได้) ---------- */}
      {tab === 'sheet' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>รายงานผิดปกติ <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>— ย้อนหลัง 7 วัน · คลิกชื่อดูประวัติรายคน{session?.role !== 'user' ? ' · กด "แก้เวลา" เพื่อแก้รายการที่ผิด' : ''}</span></span>
            <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pager page={sheet.page} total={sheet.data?.total ?? 0} onPage={sheet.setPage} />
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>เข้าหลังเวลาเริ่มเวร = สาย · ไม่มีลงเวลาออก = ลืมลงเวลาออก · {sheet.data ? `${sheet.data.from} – ${sheet.data.to}` : ''}</span>
            </span>
          </div>
          {sheet.err && <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {sheet.err}</div>}
          {!sheet.err && (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
              <thead><tr style={theadTr}><th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th><th style={th}>พนักงาน</th><th style={th}>วันที่</th><th style={th}>เวร</th><th style={th}>เข้า/ออก</th><th style={{ ...th, textAlign: 'right' }}>ปัญหา</th><th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}></th></tr></thead>
              <tbody>
                {sheetRows.map((r, i) => (
                  <tr key={i} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(sheet.page * PAGE_SIZE + i + 1)}</td>
                    <td style={{ ...td, padding: '11px 20px' }}>{nameCell(r.emp, r.name, r.dept)}</td>
                    <td style={{ ...td, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{r.date}</td>
                    <td style={{ ...td, color: 'var(--text-dim)' }}>{r.shift}</td>
                    <td style={{ ...td, fontFamily: 'var(--mono)' }}>{r.io}</td>
                    <td style={{ ...td, textAlign: 'right' }}><span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: 'var(--danger)', background: 'var(--danger-soft)' }}>{r.issue}</span></td>
                    <td style={{ ...td, padding: '11px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {session?.role !== 'user' && (
                        <button onClick={() => setFixRow(r)} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--accent-strong)', cursor: 'pointer' }}>แก้เวลา</button>
                      )}
                    </td>
                  </tr>
                ))}
                {sheet.data && sheetRows.length === 0 && <tr><td colSpan={7} style={{ ...td, padding: '18px 20px', color: dq ? 'var(--text-faint)' : 'var(--ok)', textAlign: 'center' }}>{dq ? 'ไม่พบที่ตรงกับคำค้น' : 'ไม่มีรายการผิดปกติ 🎉'}</td></tr>}
                {sheet.loading && !sheet.data && <tr><td colSpan={7} style={{ padding: 0 }}><Loading /></td></tr>}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {fixRow && <FixTimeModal hcode={hcode} row={fixRow} onClose={() => setFixRow(null)}
        onSaved={() => { setFixRow(null); setReload((r) => r + 1) }} />}

      {/* ---------- รายเดือน ---------- */}
      {tab === 'monthly' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>สรุปรายเดือนต่อคน <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>— คลิกชื่อดูประวัติรายวัน</span></span>
            <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <Pager page={monthly.page} total={monthly.data?.total ?? 0} onPage={monthly.setPage} />
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{monthly.data ? `${monthly.data.month} · นับ ${nf(monthly.data.days_counted)} วัน` : ''}</span>
            </span>
          </div>
          {monthly.err && <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {monthly.err}</div>}
          {!monthly.err && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
                <thead><tr style={theadTr}>
                  <th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th>
                  <th style={{ ...th, padding: '10px 20px' }}>พนักงาน</th>
                  <th style={{ ...th, textAlign: 'center' }}>วันที่มา</th>
                  <th style={{ ...th, textAlign: 'center' }}>สาย</th>
                  <th style={{ ...th, textAlign: 'center' }}>ออกก่อน</th>
                  <th style={{ ...th, textAlign: 'center' }}>ลืมลงเวลาออก</th>
                  <th style={{ ...th, textAlign: 'center', paddingRight: 20 }}>นอกพื้นที่</th>
                </tr></thead>
                <tbody>
                  {monthlyRows.map((r, i) => {
                    const num = (v: number, warnColor: string) => (
                      <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: v > 0 ? 700 : 400, color: v > 0 ? warnColor : 'var(--text-faint)' }}>{nf(v)}</td>
                    )
                    return (
                      <tr key={r.emp} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(monthly.page * PAGE_SIZE + i + 1)}</td>
                        <td style={{ ...td, padding: '11px 20px' }}>{nameCell(r.emp, r.name, r.dept)}</td>
                        <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', fontWeight: 600 }}>{nf(r.present)}</td>
                        {num(r.late, 'var(--warn)')}
                        {num(r.early, 'var(--warn)')}
                        {num(r.no_out, 'var(--info)')}
                        {num(r.out_area, 'var(--danger)')}
                      </tr>
                    )
                  })}
                  {monthly.data && monthlyRows.length === 0 && <tr><td colSpan={7} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>{dq ? 'ไม่พบที่ตรงกับคำค้น' : 'ไม่มีการลงเวลาในเดือนนี้'}</td></tr>}
                  {monthly.loading && !monthly.data && <tr><td colSpan={7} style={{ padding: 0 }}><Loading text="กำลังรวบรวมทั้งเดือน… (ดึงทีละวัน อาจใช้เวลาครู่หนึ่ง)" /></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {punchRow && daily.data && <PunchModal row={punchRow} fences={daily.data.fences} date={punchRow.date} onClose={() => setPunchRow(null)} />}
      {empId && <EmployeeModal hcode={hcode} empId={empId} onClose={() => setEmpId(null)} />}
    </div>
  )
}
