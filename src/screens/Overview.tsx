import { useEffect, useMemo, useState } from 'react'
import { nf, useFetch } from '../hooks'
import { daysAgoISO, filterQS, isoAddDays, localISO, ShiftDeptFilters, useAttFilterOptions } from '../components/AttFilters'
import { DatePicker, thShort } from '../components/DatePicker'
import { Donut, MeterRow, StackedBars, TrendLine } from '../components/charts'
import { PickHospital } from '../components/PickHospital'
import { Info } from '../components/Info'
import { Loading } from '../components/Spinner'
import { RefreshButton } from '../components/RefreshButton'
import { PlatformOverview } from './PlatformOverview'
import { useApp } from '../state'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }

type Row = { emp: string; seq?: number; name: string; date: string; in: string; out: string; shift: string; dept: string; late: boolean; status: string }
type Analytics = {
  summary: { date: string; date_from: string; date_to: string; days: number; punched: number; done: number; open: number; late: number; early: number; out_area: number }
  recent: Row[]
  total_staff: number
  days: { date: string; punched: number; on_time: number; late: number; early: number; avg_late_min: number }[]
  shifts: { name: string; persons: number; late: number; early: number; avg_in: string }[]
  top_late: { emp: string; name: string; dept: string; count: number; avg_min: number }[]
  avg_late_min: number
  late_rows: { emp: string; min: number }[]
}
type TenantStatus = { registered: boolean; request_type?: string; demo_expires_at?: string | null; demo_days_left?: number | null; expired?: boolean }
type Grp = { count: number; rows: { emp_id: string; name: string }[] }
type Recon = { match_no_punch: Grp; punch_no_match: Grp; not_enrolled: Grp }

// พาเลตเวร (pastel) — แต่ละเวรสีต่างกันชัด (เดิมใช้ --accent/--info ที่ชนกันเลยเช้า/ดึกสีเดียว)
const SHIFT_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)']

/** ป้ายวัน dd/mm สำหรับแกนกราฟ */
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function KpiIcon({ d, color, soft }: { d: string; color: string; soft: string }) {
  return (
    <span style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', background: soft, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  )
}

export function Overview() {
  const { currentHcode, isSuper, setNav } = useApp()
  const hcode = currentHcode === '*' ? '' : currentHcode
  const [reload, setReload] = useState(0)
  // ตัวกรอง: ช่วงวัน + เวร + แผนก (KPI/กราฟ/รายการทั้งหน้าเปลี่ยนตาม)
  // default = 7 วันล่าสุด — กราฟแนวโน้มต้องมีหลายวันถึงจะอ่านออก (เลือกวันเดียวได้ถ้าต้องการ)
  const [from, setFrom] = useState(daysAgoISO(6))
  const [to, setTo] = useState(localISO())
  const [fShifts, setFShifts] = useState<string[]>([])
  const [fDepts, setFDepts] = useState<string[]>([])
  const { shiftOpts, deptOpts } = useAttFilterOptions(hcode)
  const multiDay = from !== to
  const isToday = !multiDay && to === localISO()
  const dayLabel = isToday ? 'วันนี้' : multiDay ? `${thShort(from)} – ${thShort(to)}` : thShort(to)

  useEffect(() => { setFShifts([]); setFDepts([]); setFrom(daysAgoISO(6)); setTo(localISO()) }, [hcode])

  const q = hcode ? `hcode=${encodeURIComponent(hcode)}` : ''
  const fq = filterQS(fShifts, fDepts)
  // analytics = สรุป+กราฟ+เข้าเวรล่าสุด จบใน endpoint เดียว (ภายในกวาด HOSxP รอบเดียว)
  const anaF = useFetch<Analytics>(hcode ? `/admin/attendance/analytics?${q}&date_from=${from}&date_to=${to}${fq}` : null, reload)
  const reconF = useFetch<Recon>(hcode ? `/admin/recon?${q}&date=${to}` : null, reload)
  const tstatF = useFetch<TenantStatus>(hcode ? `/admin/tenant-status?${q}` : null, reload)
  const ana = anaF.data, recon = reconF.data, tstat = tstatF.data
  const loading = anaF.loading || reconF.loading || tstatF.loading

  const recent = ana?.recent ?? []

  // แจ้งเตือน (ของจริงเท่านั้น): สายหนัก / ออกก่อน / สแกนไม่ลงเวลา
  const notifs = useMemo(() => {
    if (!ana) return []
    const heavy = new Set(ana.late_rows.filter((r) => r.min > 30).map((r) => r.emp)).size
    const list: { title: string; sub: string; color: string; icon: string; nav?: () => void }[] = []
    if (heavy > 0) list.push({
      title: 'มีพนักงานมาสายเกิน 30 นาที', sub: `${heavy} คน · ${dayLabel}`, color: 'var(--warn)',
      icon: 'M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v4M12 16h.01', nav: () => setNav('rp-late'),
    })
    if (ana.summary.early > 0) list.push({
      title: 'มีคนออกก่อนเวลา', sub: `${ana.summary.early} ครั้ง · ${dayLabel}`, color: 'var(--accent)',
      icon: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', nav: () => setNav('rp-late'),
    })
    if ((recon?.match_no_punch.count ?? 0) > 0) list.push({
      title: 'สแกนหน้าแล้วแต่ไม่ได้ลงเวลา', sub: `${recon!.match_no_punch.count} คน · ${isToday ? 'วันนี้' : thShort(to)}`, color: 'var(--danger)',
      icon: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    })
    return list
  }, [ana, recon, dayLabel, isToday, to, setNav])

  // super เลือก "ทุกโรงพยาบาล" = Dashboard ระดับระบบ
  if (currentHcode === '*') return isSuper ? <PlatformOverview /> : <PickHospital />

  const s = ana?.summary
  // หลายวัน = ตัวเลขเป็น "ครั้ง" (คน-วัน / รอบเวร) ไม่ใช่ "คน" — ไม่งั้นอ่านว่ามีคนมากกว่าพนักงานทั้งโรง
  const u = multiDay ? 'ครั้ง' : 'คน'
  const KPIS = [
    { v: ana?.total_staff, unit: 'คน', label: 'พนักงานทั้งหมด', sub: 'ในระบบทั้งหมด', c: 'var(--info)', soft: 'var(--info-light)', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', tip: 'พนักงานสถานะทำงานอยู่ (active) ทั้งหมดของโรงพยาบาลใน HOSxP' },
    { v: s?.punched, unit: u, label: isToday ? 'ลงเวลาวันนี้' : 'ลงเวลาในช่วงที่เลือก', sub: multiDay ? 'นับเป็น คน-วัน' : 'คนที่มีบันทึกลงเวลา', c: 'var(--ok)', soft: 'var(--ok-light)', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3', tip: 'จำนวนครั้ง(คน-วัน)ที่มีบันทึกลงเวลา เข้าหรือออก อย่างน้อย 1 ครั้ง — เลือกหลายวัน คนเดิมของแต่ละวันจะนับแยกกัน' },
    { v: s?.done, unit: u, label: 'ครบเข้า-ออกเวร', sub: s ? `ยังไม่ออกเวร ${s.open}` : '', c: 'var(--accent)', soft: 'var(--accent-light)', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', tip: 'รอบเวรที่มีทั้งลงเวลาเข้าและออกครบ (ควบเวรนับแยกรอบ)' },
    { v: s?.late, unit: u, label: 'สาย', sub: 'เข้าเวรหลังเวลาเริ่ม', c: 'var(--warn)', soft: 'var(--warn-light)', icon: 'M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v4l2.5 1.5', tip: 'ลงเวลาเข้าหลังเวลาเริ่มเวรที่กำหนดใน emp_shift ของโรงพยาบาล' },
    { v: s?.early, unit: u, label: 'ออกก่อนเวลา', sub: 'ออกเวรก่อนเวลาเลิก', c: 'var(--accent)', soft: 'var(--accent-light)', icon: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', tip: 'ลงเวลาออกก่อนเวลาเลิกเวรที่กำหนดใน emp_shift' },
    { v: s?.out_area, unit: u, label: 'นอกพื้นที่', sub: 'สแกนนอกจุดที่กำหนด', c: 'var(--danger)', soft: 'var(--danger-light)', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', tip: 'สแกนลงเวลานอกรัศมีของทุกจุดที่ตั้งไว้ในแท็บ "จุดลงเวลา" (นับเฉพาะที่มีพิกัด GPS)' },
    { v: recon?.match_no_punch.count, unit: 'คน', label: 'สแกนแต่ไม่ลงเวลา', sub: `สแกนเจอตัวแต่ไม่มีบันทึก · ${isToday ? 'วันนี้' : thShort(to)}`, c: 'var(--danger)', soft: 'var(--danger-light)', icon: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01', tip: 'ระบบสแกนหน้าเจอตัวแล้ว แต่ไม่มีบันทึกลงเวลาในระบบโรงพยาบาล (เน็ตหลุด / ไม่กดยืนยัน) — ดูวันสุดท้ายของช่วง' },
  ]

  // แถบเตือนเวลาทดลองใช้ (admin โรงเห็นเอง ไม่ต้องถาม super)
  const demoBanner = (() => {
    if (!tstat?.registered || tstat.request_type !== 'demo' || !tstat.demo_expires_at) return null
    const left = tstat.demo_days_left
    const expired = tstat.expired || (left != null && left < 0)
    const tone = expired || (left != null && left <= 7) ? 'var(--danger)' : (left != null && left <= 14) ? 'var(--warn)' : 'var(--info)'
    const msg = expired
      ? `หมดระยะทดลองใช้แล้ว (${tstat.demo_expires_at}) — ติดต่อผู้ดูแลระบบเพื่อต่ออายุ`
      : `ทดลองใช้ถึง ${tstat.demo_expires_at} (เหลือ ${left} วัน)${left != null && left <= 14 ? ' — ใกล้หมดอายุ ติดต่อผู้ดูแลระบบเพื่อต่ออายุ' : ''}`
    return (
      <div style={{ ...card, padding: '11px 16px', borderLeft: `4px solid ${tone}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: tone }}>{msg}</span>
      </div>
    )
  })()

  const bars = (ana?.days ?? []).map((d) => ({
    label: dm(d.date),
    segs: [
      { v: d.on_time, color: 'var(--ok)', label: 'ตรงเวลา' },
      { v: d.late, color: 'var(--warn)', label: 'มาสาย' },
      { v: d.early, color: 'var(--accent)', label: 'ออกก่อน' },
    ],
  }))
  const shiftSegs = (ana?.shifts ?? []).filter((x) => x.name !== '—').map((x, i) => ({
    v: x.persons, color: SHIFT_COLORS[i % SHIFT_COLORS.length], label: `เวร${x.name}`,
  }))
  const noShift = (ana?.shifts ?? []).find((x) => x.name === '—')
  if (noShift) shiftSegs.push({ v: noShift.persons, color: 'var(--text-faint)', label: 'ไม่ระบุเวร' })
  const trend = (ana?.days ?? []).map((d) => ({ label: dm(d.date), v: d.avg_late_min }))
  const top5 = (ana?.top_late ?? []).slice(0, 5)

  const legend = (items: { color: string; label: string }[]) => (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
      {items.map((l) => (
        <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-dim)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color }} />{l.label}
        </span>
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
        <RefreshButton busy={loading} onClick={() => setReload((r) => r + 1)} />
      </div>

      {(anaF.err || reconF.err) && (
        <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {anaF.err || reconF.err}</div>
      )}

      {demoBanner}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 14 }}>
        {KPIS.map((k) => (
          <div key={k.label} className="lift" style={{ ...card, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <KpiIcon d={k.icon} color={k.c} soft={k.soft} />
              <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 600, lineHeight: 1.3 }}>{k.label}<Info text={k.tip} /></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 9 }}>
              <span style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.6px', fontFamily: 'var(--mono)', color: k.c }}>{nf(k.v)}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{k.unit}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* กราฟแถวแรก: รายวัน / ตามเวร / แนวโน้มสาย */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(330px, 100%), 1fr))', gap: 16, alignItems: 'stretch' }}>
        {/* การ์ดสามใบถูกยืดสูงเท่ากัน — เนื้อหาข้างในต้องยืด/กึ่งกลางตาม ไม่งั้นเหลือพื้นว่างใต้กราฟ */}
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>สถิติการเข้า-ออกงาน (รายวัน)</h2>
          {legend([{ color: 'var(--ok)', label: 'ตรงเวลา' }, { color: 'var(--warn)', label: 'มาสาย' }, { color: 'var(--accent)', label: 'ออกก่อน' }])}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {ana ? <StackedBars data={bars} height={170} /> : <Loading />}
          </div>
        </div>
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>สถิติแบ่งตามเวร<Info text="จำนวนครั้ง(คน-วัน)ที่ลงเวลา แยกตามเวรที่เลือกตอนสแกน ในช่วงวันที่เลือก" /></h2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {ana ? <Donut segs={shiftSegs} centerLabel="รวมทั้งหมด" centerValue={nf(shiftSegs.reduce((a, b) => a + b.v, 0))} size={132} /> : <Loading />}
          </div>
        </div>
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>แนวโน้มการมาสาย (นาที)</h2>
            {ana && ana.avg_late_min > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: 'var(--accent-light)', color: 'var(--accent-active)' }}>เฉลี่ย {nf(ana.avg_late_min)} นาที</span>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {ana ? <TrendLine points={trend} /> : <Loading />}
          </div>
        </div>
      </div>

      {/* แถวสอง: Top 5 สาย / สถานะพนักงาน */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 16, alignItems: 'stretch' }}>
        <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '15px 18px 11px', fontSize: 14, fontWeight: 700 }}>สรุปการมาสาย (Top 5) <span style={{ fontWeight: 500, color: 'var(--text-faint)', fontSize: 11.5 }}>· {dayLabel}</span></div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--text-faint)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', background: 'var(--surface-card)' }}>
                <th style={{ padding: '8px 18px', fontWeight: 600 }}>ลำดับ</th><th style={{ padding: '8px 8px', fontWeight: 600 }}>ชื่อ</th><th style={{ padding: '8px 8px', fontWeight: 600 }}>แผนก</th><th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'center' }}>ครั้ง</th><th style={{ padding: '8px 18px', fontWeight: 600, textAlign: 'center' }}>เฉลี่ย (นาที)</th>
              </tr></thead>
              <tbody>
                {top5.map((t, i) => (
                  <tr key={t.emp} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 18px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>{i + 1}</td>
                    <td style={{ padding: '9px 8px', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '9px 8px', color: 'var(--text-dim)' }}>{t.dept || 'ไม่ระบุแผนก'}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center', fontFamily: 'var(--mono)' }}>{nf(t.count)}</td>
                    <td style={{ padding: '9px 18px', textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{nf(t.avg_min)}</td>
                  </tr>
                ))}
                {ana && top5.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '22px 18px', textAlign: 'center', color: 'var(--ok)', fontSize: 12.5, borderTop: '1px solid var(--border)' }}>ไม่มีคนมาสายในช่วงที่เลือก — เยี่ยมมาก</td></tr>
                )}
              </tbody>
            </table>
            {!ana && <Loading />}
          </div>
          <button onClick={() => setNav('rp-late')} className="row-hover" style={{ width: '100%', padding: 11, border: 'none', borderTop: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>ดูทั้งหมด</button>
        </div>

        <div style={{ ...card, padding: '16px 18px' }}>
          {/* วันเดียว = เทียบกับพนักงานทั้งโรง / หลายวัน = เทียบกับจำนวนการลงเวลาในช่วง (ไม่งั้นหลอดล้น) */}
          <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>
            {multiDay ? 'สถานะการลงเวลา' : 'สถานะพนักงาน'} <span style={{ fontWeight: 500, color: 'var(--text-faint)', fontSize: 11.5 }}>· {dayLabel}</span>
          </h2>
          {ana ? (() => {
            const base = multiDay ? Math.max(1, ana.summary.punched) : Math.max(1, ana.total_staff)
            const pct = (n: number) => (n / base) * 100
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MeterRow dot label={multiDay ? 'มีบันทึกลงเวลา (คน-วัน)' : 'มาทำงานแล้ว (มีบันทึกลงเวลา)'} value={nf(ana.summary.punched)} pct={pct(ana.summary.punched)} color="var(--ok)" />
                <MeterRow dot label={multiDay ? 'ยังไม่ลงเวลาออก' : 'กำลังปฏิบัติงาน (ยังไม่ออกเวร)'} value={nf(ana.summary.open)} pct={pct(ana.summary.open)} color="var(--info)" />
                <MeterRow dot label="ออกเวรแล้ว (ครบเข้า-ออก)" value={nf(ana.summary.done)} pct={pct(ana.summary.done)} color="var(--accent)" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{multiDay ? 'เทียบกับการลงเวลาทั้งช่วง · พนักงานทั้งหมด' : 'พนักงานทั้งหมด'}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{nf(ana.total_staff)} คน</span>
                </div>
              </div>
            )
          })() : <Loading />}
        </div>
      </div>

      {/* แถวสาม: เข้าเวรล่าสุด / แจ้งเตือน + สแกนไม่ลงเวลา */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text-faint)' }}>การลงเวลา · {dayLabel}</div><h2 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700 }}>การเข้าเวรล่าสุด</h2></div>
          </div>
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {recent.map((r) => (
              <div key={`${r.emp}:${r.date}:${r.seq ?? 0}`} style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.late ? 'var(--warn)' : 'var(--ok)', flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name} {r.late && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: 'var(--warn-light)', color: 'var(--warn)' }}>สาย</span>}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>#{r.emp}{r.dept ? ` · ${r.dept}` : ''}{r.shift !== '—' ? ` · เวร ${r.shift}` : ''}{multiDay ? ` · ${thShort(r.date)}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                  <div style={{ color: 'var(--ok)' }}>เข้า {r.in}</div>
                  <div style={{ color: r.out !== '—' ? 'var(--text-dim)' : 'var(--text-faint)' }}>{r.out !== '—' ? `ออก ${r.out}` : 'ยังไม่ออกเวร'}</div>
                </div>
              </div>
            ))}
            {ana && recent.length === 0 && <div style={{ padding: '18px 20px', color: 'var(--text-faint)', fontSize: 12.5, textAlign: 'center' }}>{isToday ? 'ยังไม่มีคนเข้าเวรวันนี้' : `ไม่มีข้อมูลเข้าเวรช่วง ${dayLabel}`}</div>}
            {!ana && !anaF.err && <Loading />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700 }}>การแจ้งเตือน</div>
            {notifs.map((n) => (
              <div key={n.title} onClick={n.nav} className={n.nav ? 'row-hover' : undefined}
                style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 11, alignItems: 'flex-start', cursor: n.nav ? 'pointer' : 'default' }}>
                <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 8, background: n.color, color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{n.sub}</div>
                </div>
              </div>
            ))}
            {ana && notifs.length === 0 && <div style={{ padding: '16px 18px', color: 'var(--ok)', fontSize: 12.5, textAlign: 'center' }}>ไม่มีเรื่องต้องเตือน — เรียบร้อยดี</div>}
            {!ana && <Loading />}
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{nf(recon?.match_no_punch.count)}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>สแกนหน้าแล้ว แต่ไม่ได้ลงเวลา</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>{isToday ? 'วันนี้' : thShort(to)} — สแกนเจอตัวแล้วแต่ไม่มีบันทึกลงเวลา (หลุด/เน็ต/ไม่กดยืนยัน)</div>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {recon?.match_no_punch.rows.map((r) => (
                <div key={r.emp_id} className="row-hover" style={{ padding: '11px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>#{r.emp_id}</span>
                </div>
              ))}
              {recon && recon.match_no_punch.rows.length === 0 && <div style={{ padding: '16px 20px', color: 'var(--ok)', fontSize: 12.5, textAlign: 'center' }}>ไม่มี — เรียบร้อยดี</div>}
              {!recon && !reconF.err && <Loading />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
