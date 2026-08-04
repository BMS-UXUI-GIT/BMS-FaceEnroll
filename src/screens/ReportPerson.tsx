import { useEffect, useState } from 'react'
import { nf, useFetch, useServerPage } from '../hooks'
import { daysAgoISO, isoAddDays, localISO } from '../components/AttFilters'
import { DatePicker, thShort } from '../components/DatePicker'
import { Loading } from '../components/Spinner'
import { Pager, PAGE_SIZE, SearchInput, usePaged } from '../components/Pager'
import { PickHospital } from '../components/PickHospital'
import { RefreshButton } from '../components/RefreshButton'
import { useApp } from '../state'

// รายงานรายบุคคล — list เลือกพนักงาน -> detail โปรไฟล์ + สรุปช่วง + ประวัติลงเวลา

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '10px 8px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '11px 8px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-2)' }

type Emp = { emp: string; name: string; dept: string; position: string; phone: string; start_date: string; emp_type: string }
type EmpList = { count: number; total: number; rows: Emp[] }
type HistRow = { date: string; seq?: number; in: string; out: string; shift: string; late: boolean; early: boolean; late_min: number; early_min: number; no_out: boolean }
type EmpHist = {
  emp_id: string; name: string; days: number
  stat: { present: number; late: number; early: number; no_out: number; out_area: number }
  rows: HistRow[]
}

// ค่าว่าง: แผนก = "ไม่ระบุแผนก" / อื่นๆ = "—"
const deptTxt = (d: string) => (d ? d : 'ไม่ระบุแผนก')
const blank = (v: string) => (v && v.trim() ? v : '—')

// อักษรย่อจากชื่อ (ตัวแรกของชื่อ + ตัวแรกของสกุล)
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]
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

// badge สถานะรายวัน (ซ้อนกันได้ เช่น สาย + ออกก่อน)
function StatusBadges({ r }: { r: HistRow }) {
  const items: [boolean, string, string, string][] = [
    [r.late, r.late_min > 0 ? `มาสาย ${nf(r.late_min)} นาที` : 'มาสาย', 'var(--warn)', 'var(--warn-soft)'],
    [r.early, r.early_min > 0 ? `ออกก่อน ${nf(r.early_min)} นาที` : 'ออกก่อน', 'var(--accent)', 'var(--accent-soft)'],
    [r.no_out, 'ลืมลงเวลาออก', 'var(--info)', 'var(--info-soft)'],
  ]
  const on = items.filter(([v]) => v)
  const pill = (label: string, color: string, bg: string) => (
    <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color, background: bg, whiteSpace: 'nowrap' }}>{label}</span>
  )
  if (on.length === 0) return pill('ปกติ', 'var(--ok)', 'var(--ok-soft)')
  return (
    <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {on.map(([, label, color, bg]) => pill(label, color, bg))}
    </span>
  )
}

function Avatar({ name, size, fontSize }: { name: string; size: number; fontSize: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)',
      fontSize, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    }}>{initials(name)}</span>
  )
}

export function ReportPerson() {
  const { currentHcode } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<Emp | null>(null)
  // ช่วงวันของ detail (default 30 วันล่าสุด)
  const [from, setFrom] = useState(daysAgoISO(29))
  const [to, setTo] = useState(localISO())

  useEffect(() => { setSel(null); setSearch('') }, [hcode])

  const q = `hcode=${encodeURIComponent(hcode)}`
  // ค้นหาชื่อ/รหัส — หน่วง 300ms แล้วส่ง backend (แบ่งหน้า+ค้นข้ามทุกหน้าฝั่งเซิร์ฟเวอร์)
  const [dq, setDq] = useState('')
  useEffect(() => { const t = setTimeout(() => setDq(search.trim()), 300); return () => clearTimeout(t) }, [search])
  // list โหลดทีละหน้า — กดกลับจาก detail หน้าเดิมยังอยู่
  const listF = useServerPage<EmpList>(hcode ? `/admin/employees?${q}${dq ? `&q=${encodeURIComponent(dq)}` : ''}` : null, reload)
  const histF = useFetch<EmpHist>(
    hcode && sel ? `/admin/attendance/employee?${q}&emp_id=${encodeURIComponent(sel.emp)}&date_from=${from}&date_to=${to}` : null,
    reload,
  )
  const histPaged = usePaged(histF.data?.rows ?? [])

  if (currentHcode === '*') return <PickHospital />

  const openDetail = (p: Emp) => {
    setFrom(daysAgoISO(29))
    setTo(localISO())
    setSel(p)
  }

  const shown = listF.data?.rows ?? []  // server ทำ filter+แบ่งหน้าให้แล้ว

  // ---------- โหมด list ----------
  if (!sel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 'var(--page-max)' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>ดูข้อมูลการเข้า-ออกงานของพนักงานรายคนอย่างละเอียด</p>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>เลือกพนักงานเพื่อดูรายละเอียด</span>
            {listF.data && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ทั้งหมด {nf(listF.data.count)} คน</span>}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <SearchInput value={search} onChange={setSearch} placeholder="ค้นชื่อ / รหัสพนักงาน…" width={180} />
              <Pager page={listF.page} total={listF.data?.total ?? 0} onPage={listF.setPage} />
              <RefreshButton busy={listF.loading} onClick={() => setReload((r) => r + 1)} />
            </span>
          </div>
          {listF.err && <div style={{ padding: '14px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {listF.err}</div>}
          {!listF.err && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
                <thead>
                  <tr style={theadTr}>
                    <th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th>
                    <th style={{ ...th, padding: '10px 20px' }}>รหัส</th>
                    <th style={th}>ชื่อ-สกุล</th>
                    <th style={th}>แผนก</th>
                    <th style={th}>ตำแหน่ง</th>
                    <th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p, i) => (
                    <tr key={p.emp} className="row-hover" style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => openDetail(p)}>
                      <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(listF.page * PAGE_SIZE + i + 1)}</td>
                      <td style={{ ...td, padding: '11px 20px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{blank(p.emp)}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                          <Avatar name={p.name} size={28} fontSize={10.5} />
                          <span style={{ fontWeight: 600 }}>{blank(p.name)}</span>
                        </span>
                      </td>
                      <td style={{ ...td, color: 'var(--text-dim)' }}>{deptTxt(p.dept)}</td>
                      <td style={{ ...td, color: 'var(--text-dim)' }}>{blank(p.position)}</td>
                      <td style={{ ...td, padding: '11px 20px', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>ดูข้อมูล →</span>
                      </td>
                    </tr>
                  ))}
                  {listF.data && shown.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>{dq ? 'ไม่พบพนักงานที่ตรงกับคำค้น' : 'ไม่มีข้อมูลพนักงาน'}</td></tr>
                  )}
                  {listF.loading && !listF.data && <tr><td colSpan={6} style={{ padding: 0 }}><Loading /></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- โหมด detail ----------
  const s = histF.data?.stat
  const SUM: [string, number | undefined, string][] = [
    ['วันที่มา', s?.present, 'var(--ok)'],
    ['มาสาย', s?.late, 'var(--warn)'],
    ['ออกก่อน', s?.early, 'var(--accent)'],
    ['ลืมลงเวลาออก', s?.no_out, 'var(--info)'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 'var(--page-max)' }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>ดูข้อมูลการเข้า-ออกงานของพนักงานรายคนอย่างละเอียด</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setSel(null)} style={{
          display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, padding: '8px 13px',
          borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)',
          cursor: 'pointer', fontFamily: 'var(--sans)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          กลับไปรายชื่อ
        </button>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <DatePicker value={from} min={isoAddDays(to, -61)} max={to} onChange={setFrom} />
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
            <DatePicker value={to} min={from} max={localISO()}
              onChange={(v) => { setTo(v); if (from < isoAddDays(v, -61)) setFrom(isoAddDays(v, -61)) }} />
          </span>
          <RefreshButton busy={histF.loading} onClick={() => setReload((r) => r + 1)} />
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* โปรไฟล์ */}
        <div style={{ ...card, width: 300, flex: 'none', padding: '22px 20px', textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, margin: '0 auto 12px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>{initials(sel.name)}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{blank(sel.name)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2, fontFamily: 'var(--mono)' }}>{blank(sel.emp)} · <span style={{ fontFamily: 'var(--sans)' }}>{deptTxt(sel.dept)}</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{blank(sel.position)}</div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: 'var(--text-faint)' }}>วันที่เริ่มงาน</span><span style={{ fontFamily: 'var(--mono)' }}>{startTxt(sel.start_date)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: 'var(--text-faint)' }}>ประเภท</span><span>{blank(sel.emp_type)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: 'var(--text-faint)' }}>เบอร์โทร</span><span style={{ fontFamily: 'var(--mono)' }}>{blank(sel.phone)}</span></div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {histF.err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {histF.err}</div>}

          {/* สรุปช่วงที่เลือก */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
              สรุปช่วงที่เลือก <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: 12 }}>— {thShort(from)} ถึง {thShort(to)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: 10 }}>
              {SUM.map(([label, n, color]) => (
                <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color }}>{nf(n)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ประวัติการเข้า-ออกงาน */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>ประวัติการเข้า-ออกงาน</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 640 }}>
                <thead>
                  <tr style={{ ...theadTr, fontSize: 10, letterSpacing: '.4px' }}>
                    <th style={{ ...th, padding: '9px 18px', textAlign: 'right', width: 56 }}>ลำดับ</th>
                    <th style={{ ...th, padding: '9px 8px' }}>วันที่</th>
                    <th style={{ ...th, padding: '9px 8px' }}>เวร</th>
                    <th style={{ ...th, padding: '9px 8px' }}>เข้า</th>
                    <th style={{ ...th, padding: '9px 8px' }}>ออก</th>
                    <th style={{ ...th, padding: '9px 8px' }}>รวม</th>
                    <th style={{ ...th, padding: '9px 18px', textAlign: 'right' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {histPaged.pageRows.map((r, i) => (
                    <tr key={`${r.date}:${r.seq ?? 0}`} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ ...td, padding: '10px 18px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11.5 }}>{nf(histPaged.offset + i + 1)}</td>
                      <td style={{ ...td, padding: '10px 8px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{thShort(r.date)}</td>
                      <td style={{ ...td, padding: '10px 8px', color: 'var(--text-dim)' }}>{blank(r.shift)}</td>
                      <td style={{ ...td, padding: '10px 8px', fontFamily: 'var(--mono)', color: r.late ? 'var(--warn)' : 'var(--ok)', fontWeight: 600 }}>{blank(r.in)}</td>
                      <td style={{ ...td, padding: '10px 8px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{blank(r.out)}</td>
                      <td style={{ ...td, padding: '10px 8px', fontFamily: 'var(--mono)' }}>{totalHours(r.in, r.out)}</td>
                      <td style={{ ...td, padding: '10px 18px', textAlign: 'right' }}><StatusBadges r={r} /></td>
                    </tr>
                  ))}
                  {histF.data && histF.data.rows.length === 0 && (
                    <tr><td colSpan={7} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>ไม่มีการลงเวลาในช่วงนี้</td></tr>
                  )}
                  {histF.loading && !histF.data && <tr><td colSpan={7} style={{ padding: 0 }}><Loading text="กำลังโหลด… (ดึงทีละวัน อาจใช้เวลาครู่หนึ่ง)" /></td></tr>}
                </tbody>
              </table>
            </div>
            {histF.data && histF.data.rows.length > PAGE_SIZE && (
              <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}><Pager page={histPaged.page} total={histPaged.total} onPage={histPaged.setPage} /></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
