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
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-2)' }

// สีวนสำหรับ Donut แยกแผนก (pastel, แต่ละแผนกต่างกันชัด)
const CYCLE = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)']

type DeptRow = { dept: string; staff: number; present: number; person_days: number; late: number; early: number; no_out: number; rate: number | null }
type Analytics = {
  summary: { date_from: string; date_to: string; days: number; punched: number; done: number; open: number; late: number; early: number; out_area: number }
  total_staff: number
  depts: DeptRow[]
}

const deptName = (d: string) => (d.trim() === '' ? 'ไม่ระบุแผนก' : d)
const fmtRate = (r: number | null) => (r != null ? `${r.toFixed(2)}%` : '—')

export function ReportDept() {
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

  // เรียงอัตรามาทำงานมาก→น้อย (แบบเดียวกับดีไซน์) ใช้ทั้งหลอดเทียบ + ตาราง
  const depts = [...(ana?.depts ?? [])].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))
  const presentSum = depts.reduce((s, d) => s + d.present, 0)
  // โดนัทมาสาย: เฉพาะแผนกที่มีคนสาย เรียงมาก→น้อย สีวนตามลำดับ
  const lateSegs = depts.filter((d) => d.late > 0).sort((a, b) => b.late - a.late)
    .map((d, i) => ({ v: d.late, color: CYCLE[i % CYCLE.length], label: deptName(d.dept) }))

  const days = ana?.summary.days ?? 1
  const multiDay = days > 1
  const KPIS = [
    { label: 'พนักงานทั้งหมด', v: ana?.total_staff, sub: 'คน', c: 'var(--text)' },
    { label: multiDay ? 'มาทำงาน (คนที่มาอย่างน้อย 1 วัน)' : 'มาทำงาน', v: ana ? presentSum : undefined, sub: 'คน', c: 'var(--ok)' },
    { label: 'มาสาย', v: ana?.summary.late, sub: multiDay ? 'ครั้ง' : 'คน', c: 'var(--warn)' },
    { label: 'ออกก่อน', v: ana?.summary.early, sub: multiDay ? 'ครั้ง' : 'คน', c: 'var(--accent)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>ดูสถิติและเปรียบเทียบข้อมูลการเข้า-ออกงานของแต่ละแผนก</p>
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

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 12 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ ...card, padding: '15px 16px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{k.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: k.c }}>{nf(k.v)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card, padding: '16px 18px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>เปรียบเทียบแต่ละแผนก (อัตรามาทำงาน)</h2>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 14 }}>
            เฉลี่ยต่อวัน = คน-วันที่ลงเวลา ÷ (พนักงานในแผนก × {days} วัน)
          </div>
          {!ana && !anaF.err ? <Loading /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {depts.map((d) => (
                <MeterRow key={d.dept || '(none)'} label={deptName(d.dept)}
                  value={fmtRate(d.rate)} pct={d.rate ?? 0} color="var(--accent)" />
              ))}
              {ana && depts.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>ไม่มีข้อมูลในช่วงที่เลือก</span>}
            </div>
          )}
        </div>
        <div style={{ ...card, padding: '16px 18px' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>สัดส่วนการมาสาย</h2>
          {!ana && !anaF.err ? <Loading /> : (
            <Donut segs={lateSegs} centerLabel="รวม" centerValue={nf(ana?.summary.late)} size={118} />
          )}
        </div>
      </div>

      {/* ตารางสรุปรายแผนก */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700 }}>สรุปรายแผนก</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead><tr style={theadTr}>
              <th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th>
              <th style={{ ...th, padding: '10px 20px' }}>แผนก</th>
              <th style={{ ...th, textAlign: 'center' }}>พนักงาน</th>
              <th style={{ ...th, textAlign: 'center' }}>มาทำงาน</th>
              {multiDay && <th style={{ ...th, textAlign: 'center' }}>คน-วัน</th>}
              <th style={{ ...th, textAlign: 'center' }}>มาสาย</th>
              <th style={{ ...th, textAlign: 'center' }}>ออกก่อน</th>
              <th style={{ ...th, textAlign: 'center' }}>ลืมออก</th>
              <th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}>อัตรามาทำงาน</th>
            </tr></thead>
            <tbody>
              {depts.map((d, i) => (
                <tr key={d.dept || '(none)'} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(i + 1)}</td>
                  <td style={{ ...td, padding: '11px 20px', fontWeight: 600 }}>{deptName(d.dept)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)' }}>{nf(d.staff)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--ok)' }}>{nf(d.present)}</td>
                  {multiDay && <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{nf(d.person_days)}</td>}
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{nf(d.late)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{nf(d.early)}</td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--info)' }}>{nf(d.no_out)}</td>
                  <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmtRate(d.rate)}</td>
                </tr>
              ))}
              {ana && depts.length === 0 && <tr><td colSpan={multiDay ? 9 : 8} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>ไม่มีข้อมูลในช่วงที่เลือก</td></tr>}
              {anaF.loading && !ana && <tr><td colSpan={8} style={{ padding: 0 }}><Loading /></td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-faint)' }}>
          โรงที่ยังไม่กรอกแผนกใน HOSxP จะรวมอยู่ใน "ไม่ระบุแผนก"
        </div>
      </div>
    </div>
  )
}
