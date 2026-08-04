import { useEffect, useState } from 'react'
import { nf, useFetch } from '../hooks'
import { daysAgoISO, isoAddDays, localISO } from '../components/AttFilters'
import { DatePicker } from '../components/DatePicker'
import { Donut, MeterRow } from '../components/charts'
import { PickHospital } from '../components/PickHospital'
import { Loading } from '../components/Spinner'
import { RefreshButton } from '../components/RefreshButton'
import { useApp } from '../state'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '11px 12px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-card)' }

// สีสลับต่อเวร (pastel, แยกแต่ละเวรชัด): พื้นการ์ด(ทินต์) / ตัวเลข / กราฟ — index เดียวกัน = เวรเดียวกันทุกที่
const CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)']
const BG = CAT.map((c) => `color-mix(in srgb, ${c} 14%, var(--surface))`)
const NUM_C = CAT
const CHART_C = CAT

type ShiftRow = { name: string; persons: number; late: number; early: number; avg_in: string }
type Analytics = { shifts: ShiftRow[] }

const shiftName = (s: string) => (s.trim() === '' ? '—' : s)
// "HH:MM" -> % ของวัน (นาทีตั้งแต่เที่ยงคืน / 1440)
const avgInPct = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  return m ? ((Number(m[1]) * 60 + Number(m[2])) / 1440) * 100 : 0
}

export function ReportShift() {
  const { currentHcode } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  // default = 7 วันล่าสุด (ภาพรวม/เทียบสัดส่วน ต้องมีหลายวันถึงจะมีความหมาย)
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(localISO())

  // สลับโรง = กลับมาดูวันนี้
  useEffect(() => { setFrom(daysAgoISO(6)); setTo(localISO()) }, [hcode])

  const anaF = useFetch<Analytics>(
    hcode ? `/admin/attendance/analytics?hcode=${encodeURIComponent(hcode)}&date_from=${from}&date_to=${to}` : null, reload)
  const ana = anaF.data

  if (currentHcode === '*') return <PickHospital />

  const shifts = ana?.shifts ?? []
  const totalPersons = shifts.reduce((s, x) => s + x.persons, 0)
  const totalLate = shifts.reduce((s, x) => s + x.late, 0)
  const pctOf = (v: number) => (totalPersons > 0 ? `${((v / totalPersons) * 100).toFixed(2)}%` : '—')
  const lateSegs = shifts.map((s, i) => ({ v: s.late, color: CHART_C[i % CHART_C.length], label: shiftName(s.name) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>ดูสถิติการเข้า-ออกงานแยกตามเวรการทำงาน</p>
        <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <DatePicker value={from} min={isoAddDays(to, -30)} max={to} onChange={setFrom} />
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ถึง</span>
            <DatePicker value={to} min={from} max={localISO()}
              onChange={(v) => { setTo(v); if (from < isoAddDays(v, -30)) setFrom(isoAddDays(v, -30)) }} />
          </span>
          <RefreshButton busy={anaF.loading} onClick={() => setReload((r) => r + 1)} />
        </span>
      </div>

      {anaF.err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {anaF.err}</div>}

      {/* การ์ดต่อเวร */}
      {!ana && !anaF.err ? (
        <div style={card}><Loading /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 14 }}>
          {shifts.map((s, i) => (
            <div key={s.name || i} style={{ background: BG[i % BG.length], border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>{shiftName(s.name)}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color: NUM_C[i % NUM_C.length] }}>{nf(s.persons)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>คน ({pctOf(s.persons)})</span>
              </div>
            </div>
          ))}
          {shifts.length === 0 && <div style={{ ...card, padding: '18px 20px', color: 'var(--text-faint)', fontSize: 12.5 }}>ไม่มีข้อมูลในช่วงที่เลือก</div>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card, padding: '16px 18px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>อัตราการมาสายแยกตามเวร</h2>
          {!ana && !anaF.err ? <Loading /> : (
            <Donut segs={lateSegs} centerLabel="มาสาย" centerValue={nf(totalLate)} size={118} />
          )}
        </div>
        <div style={{ ...card, padding: '16px 18px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>เปรียบเทียบเวลาเข้าเฉลี่ย</h2>
          {!ana && !anaF.err ? <Loading /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {shifts.map((s, i) => (
                <MeterRow key={s.name || i} label={shiftName(s.name)}
                  value={s.avg_in} pct={avgInPct(s.avg_in)} color={CHART_C[i % CHART_C.length]} />
              ))}
              {ana && shifts.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>ไม่มีข้อมูลในช่วงที่เลือก</span>}
            </div>
          )}
        </div>
      </div>

      {/* ตารางสรุปตามเวร */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700 }}>สรุปตามเวร</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
            <thead><tr style={theadTr}>
              <th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th>
              <th style={{ ...th, padding: '10px 20px' }}>เวร</th>
              <th style={{ ...th, textAlign: 'center' }}>ลงเวลา</th>
              <th style={{ ...th, textAlign: 'center' }}>มาสาย</th>
              <th style={{ ...th, textAlign: 'center' }}>ออกก่อน</th>
              <th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}>เวลาเข้าเฉลี่ย</th>
            </tr></thead>
            <tbody>
              {shifts.map((s, i) => (
                <tr key={s.name || i} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(i + 1)}</td>
                  <td style={{ ...td, padding: '11px 20px', fontWeight: 600 }}>{shiftName(s.name)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)' }}>{nf(s.persons)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{nf(s.late)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{nf(s.early)}</td>
                  <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{s.avg_in}</td>
                </tr>
              ))}
              {ana && shifts.length === 0 && <tr><td colSpan={6} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>ไม่มีข้อมูลในช่วงที่เลือก</td></tr>}
              {anaF.loading && !ana && <tr><td colSpan={6} style={{ padding: 0 }}><Loading /></td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-faint)' }}>
          ไม่แสดงอัตรามาทำงาน — ระบบไม่มีตารางเวรล่วงหน้า จึงไม่ทราบว่าแต่ละคนต้องอยู่เวรใด
        </div>
      </div>
    </div>
  )
}
