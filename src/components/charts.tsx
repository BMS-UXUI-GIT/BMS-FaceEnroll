// กราฟชิ้นเล็กที่ใช้ร่วมทั้ง dashboard + แท็บวิเคราะห์ — CSS/SVG ล้วน ไม่มี lib
// ทุกตัว responsive (กว้าง 100% ของกล่อง) และใช้สีจาก CSS vars (สลับธีมได้เอง)

export type Seg = { v: number; color: string; label?: string }

/** กราฟแท่งซ้อนรายวัน — แกน Y อัตโนมัติ, แถบเลื่อนแนวนอนเมื่อวันเยอะ */
export function StackedBars({ data, height = 150, unit = 'คน' }: {
  data: { label: string; segs: Seg[] }[]
  height?: number
  unit?: string
}) {
  const totals = data.map((d) => d.segs.reduce((s, x) => s + x.v, 0))
  const max = Math.max(4, ...totals)
  const { top, ticks } = axis(max)
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', height, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)', paddingBottom: 1 }}>
        {ticks.map((t, i) => <span key={i}>{fmtNum(t)}</span>)}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: Math.max(0, data.length * 26) }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height, borderLeft: '1px solid var(--border-strong)', borderBottom: '1px solid var(--border-strong)', padding: '0 6px' }}>
            {data.map((d, i) => (
              <div key={i} title={`${d.label} · ${totals[i]} ${unit}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', maxWidth: 30, display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                  {d.segs.map((s, j) => (
                    <div key={j} style={{ height: (s.v / top) * (height - 4), background: s.color }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '5px 6px 0' }}>
            {data.map((d, i) => (
              <span key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** โดนัท conic-gradient + legend — ค่า 0 ทั้งหมดจะโชว์วงจาง */
export function Donut({ segs, centerLabel, centerValue, size = 120 }: {
  segs: Seg[]
  centerLabel: string
  centerValue: string | number
  size?: number
}) {
  const total = segs.reduce((s, x) => s + x.v, 0)
  let acc = 0
  const stops = total > 0
    ? segs.map((s) => {
        const from = (acc / total) * 100
        acc += s.v
        return `${s.color} ${from.toFixed(2)}% ${((acc / total) * 100).toFixed(2)}%`
      }).join(', ')
    : 'var(--surface-3) 0 100%'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size, flex: 'none', borderRadius: '50%', background: `conic-gradient(${stops})` }}>
        <div style={{ position: 'absolute', inset: Math.round(size * 0.18), borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{centerLabel}</span>
          <span style={{ fontSize: size >= 120 ? 21 : 18, fontWeight: 700, fontFamily: 'var(--mono)' }}>{centerValue}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 120 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flex: 'none' }} />
            <span style={{ color: 'var(--text-dim)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmtNum(s.v)}{total > 0 ? ` (${((s.v / total) * 100).toFixed(1)}%)` : ''}</span>
          </div>
        ))}
        {total === 0 && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ไม่มีข้อมูลในช่วงที่เลือก</span>}
      </div>
    </div>
  )
}

/** กราฟเส้นแนวโน้ม (SVG) — จุด + พื้นจาง แกน Y อัตโนมัติ */
export function TrendLine({ points, color = 'var(--accent)', height = 210 }: {
  points: { label: string; v: number }[]
  color?: string
  height?: number
}) {
  const W = 340
  const padL = 34, padT = 16, padB = 34
  const plotH = height - padT - padB
  const max = Math.max(4, ...points.map((p) => p.v))
  const { top, ticks } = axis(max)
  const n = points.length
  const x = (i: number) => n <= 1 ? padL + (W - padL) / 2 : padL + 20 + (i * (W - padL - 30)) / (n - 1)
  const y = (v: number) => padT + plotH - (v / top) * plotH
  const line = points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          {/* เส้นฐาน (0) ทึบ ที่เหลือเป็นเส้นประ */}
          <line x1={padL} y1={y(t)} x2={W} y2={y(t)} stroke={t === 0 ? 'var(--border-strong)' : 'var(--border)'} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--text-faint)">{fmtNum(t)}</text>
        </g>
      ))}
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--border-strong)" strokeWidth={1} />
      {n > 1 && <polygon points={`${line} ${x(n - 1)},${y(0)} ${x(0)},${y(0)}`} fill={color} opacity={0.1} />}
      {n > 0 && <polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.v)} r={3.5} fill={i === n - 1 ? color : 'var(--surface)'} stroke={color} strokeWidth={2}>
          <title>{`${p.label} · ${p.v}`}</title>
        </circle>
      ))}
      {points.map((p, i) => (
        // label ถี่เกิน → เว้นให้เหลือ ~7 ป้าย
        (n <= 8 || i % Math.ceil(n / 7) === 0 || i === n - 1)
          ? <text key={`t${i}`} x={x(i)} y={height - padB + 16} textAnchor="middle" fontSize={9} fill="var(--text-faint)">{p.label}</text>
          : null
      ))}
    </svg>
  )
}

/** แถวหลอดเปอร์เซ็นต์ (ใช้ทั้งสถานะพนักงาน/เทียบแผนก/เวลาเข้าเฉลี่ย) */
export function MeterRow({ label, value, pct, color, dot }: {
  label: string
  value: string
  pct: number // 0-100
  color: string
  dot?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, marginBottom: 5 }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />}
        <span style={{ color: 'var(--text-dim)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, whiteSpace: 'nowrap' }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 5, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

/** แกน Y: หาขั้น (1/2/5×10^n) แล้วปักเส้นทีละขั้นจนถึงเพดาน — เลขบนแกนไม่เป็นทศนิยม */
function axis(max: number): { top: number; ticks: number[] } {
  const step = niceStep(max / 4)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = top; v >= 0; v -= step) ticks.push(Number(v.toFixed(6)))
  return { top, ticks }
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const r = raw / mag
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag
}

// เลขบนแกน/legend: มี comma หลักพัน, ทศนิยมไม่เกิน 1 ตำแหน่ง
function fmtNum(n: number): string {
  const v = Number.isInteger(n) ? n : Number(n.toFixed(1))
  return v.toLocaleString('en-US')
}
