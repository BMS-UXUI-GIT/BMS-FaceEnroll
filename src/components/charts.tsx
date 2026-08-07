// กราฟชิ้นเล็กที่ใช้ร่วมทั้ง dashboard + แท็บวิเคราะห์
// ทุกตัว responsive (กว้าง 100% ของกล่อง) และใช้สีจาก CSS vars (สลับธีมได้เอง)
// กราฟที่มีแกน (PercentBars/StackedColumns/GroupedBars/TrendLine) ใช้ recharts
// ที่ไม่มีแกน (SegmentBar/Donut/MeterRow/DayTimeBars/StackedBars) ยังเป็น CSS/SVG มือ — recharts ไม่ได้ช่วยอะไร
import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// ชี้ที่ legend = เน้นชิ้นนั้นในกราฟ (ชิ้นอื่นจาง) — ใช้ร่วมทุกกราฟที่มี legend
const DIM = 0.18
export const focusOpacity = (hi: string | number | null, key: string | number) => (hi == null || hi === key ? 1 : DIM)
/** props ของ legend 1 ชิ้น — ชี้แล้วเน้น, เอาเมาส์ออกแล้วคืนสภาพ (คีย์บอร์ดใช้ focus/blur) */
export const legendHover = (set: (v: any) => void, key: string | number) => ({
  onMouseEnter: () => set(key),
  onMouseLeave: () => set(null),
  onFocus: () => set(key),
  onBlur: () => set(null),
  tabIndex: 0,
  style: { cursor: 'default' as const },
})

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
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height, borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '0 6px' }}>
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

/** คอลัมน์เทียบเป็น % — หน้ารายแผนก (เปรียบเทียบการมาทำงานของแต่ละแผนก)
    ตัวเลข % บนหัวแท่ง · แกน Y 0-100%
    fit = ย่อทุกแท่งให้พอดีความกว้างกล่อง (ไม่มีแถบเลื่อน) แล้วบอกว่าแท่งไหนคือแผนกไหนด้วยสี + legend
         (ชื่อแผนกไทยยาว วางใต้แท่งแล้วชนกันจนอ่านไม่ออกเมื่อแผนกเยอะ) */
export function PercentBars({ rows, color = 'var(--accent)', colors, height = 320, columnWidth = 96, fit, valueLabel = 'อัตราเข้าทำงาน' }: {
  rows: { label: string; pct: number }[]
  color?: string
  /** สีรายแท่ง (วนซ้ำถ้าไม่พอ) — ใช้ตอนอยากแยกสีต่อหมวด เช่นต่อแผนก */
  colors?: string[]
  height?: number
  columnWidth?: number
  fit?: boolean
  /** ชื่อค่าที่วัด — ใช้ใน tooltip ทั้งของแท่งและของ legend */
  valueLabel?: string
}) {
  const minWidth = fit ? undefined : Math.max(320, rows.length * columnWidth)
  const cellColor = (i: number) => (colors?.length ? colors[i % colors.length] : color)
  const [hi, setHi] = useState<number | null>(null)
  return (
    <div style={fit ? undefined : { overflowX: 'auto' }}>
      {/* legend แทนชื่อใต้แกน X — เรียงลำดับเดียวกับแท่ง (ซ้าย→ขวา) · ชี้แล้วเน้นแท่งนั้น */}
      {fit && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 'var(--sp-3)' }}>
          {rows.map((r, i) => (
            <span key={r.label} {...legendHover(setHi, i)}
              style={{
                position: 'relative',
                display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, whiteSpace: 'nowrap',
                color: hi == null || hi === i ? 'var(--text-dim)' : 'var(--text-faint)',
                opacity: hi == null || hi === i ? 1 : 0.5, transition: 'opacity .12s ease',
              }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: cellColor(i), flex: 'none' }} />
              {r.label}
            </span>
          ))}
        </div>
      )}
      <div style={{ minWidth, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap={fit ? '15%' : '25%'}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickMargin={10}
              tick={fit ? false : { fill: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--sans)' }} height={fit ? 12 : undefined} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} width={48}
              tickLine={false} axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--text-faint)', fontSize: 12, fontFamily: 'var(--sans)' }} />
            {/* ชี้ที่ legend = เปิด tooltip ค้างไว้ที่แท่งของแผนกนั้น (active + defaultIndex คุมจากภายนอก)
                hi = null -> undefined เพื่อคืนสิทธิ์ให้ recharts คุมตามเมาส์ตามปกติ */}
            <Tooltip cursor={{ fill: 'var(--surface-alt)' }}
              active={hi != null ? true : undefined} defaultIndex={hi ?? undefined}
              formatter={(v) => [`${(Number(v) || 0).toFixed(1)}%`, valueLabel]}
              contentStyle={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--sans)', fontSize: 13,
              }}
              labelStyle={{ color: 'var(--text)', fontWeight: 500, marginBottom: 4 }} />
            <Bar dataKey="pct" fill={color} maxBarSize={36} radius={[4, 4, 0, 0]}>
              {rows.map((_r, i) => <Cell key={i} fill={cellColor(i)} fillOpacity={focusOpacity(hi, i)} />)}
              {/* แผนกเยอะ + บีบให้พอดีกล่อง = ตัวเลขบนหัวแท่งชนกัน ปล่อยให้ดูจาก tooltip แทน */}
              {fit && rows.length > 8 ? null : (
              <LabelList dataKey="pct" position="top" formatter={(v) => `${(Number(v) || 0).toFixed(1)}%`}
                style={{ fill: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 500 }} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** คอลัมน์ซ้อน (stacked) — Figma หน้าหลัก node 13:2973 "สถิติการเข้า-ออกงาน"
    1 แท่ง = 1 วัน ซ้อนตามชุดข้อมูล · legend วาดเองจากฝั่งผู้เรียก (ให้วางมุมขวาบนได้) */
export function StackedColumns({ groups, series, height = 240, unit = 'ครั้ง', columnWidth = 56, axisLabel, active }: {
  groups: { label: string; values: Record<string, number> }[]
  series: { key: string; label: string; color: string }[]
  height?: number
  unit?: string
  columnWidth?: number
  /** ป้ายใต้แกน X (Figma หน้าหลักเขียน "วันที่") */
  axisLabel?: string
  /** key ของชุดข้อมูลที่กำลังชี้อยู่ที่ legend — ชุดอื่นจางลง (legend วาดจากฝั่งผู้เรียก) */
  active?: string | null
}) {
  const data = groups.map((g) => ({ label: g.label, ...g.values }))
  // columnWidth 0 = ให้กราฟย่อพอดีกล่อง (ไม่มีแถบเลื่อน) — ใช้ตอนวางคู่กับการ์ดในพื้นที่แคบ
  const minWidth = groups.length * columnWidth
  const margin = { top: 8, right: 8, left: 0, bottom: axisLabel ? 16 : 0 }
  // เพดานแกน Y คิดเองแล้วส่งให้ทั้ง 2 กราฟ — กราฟแกนที่ปักไว้ซ้ายกับกราฟที่เลื่อนได้จะได้สเกลตรงกันเป๊ะ
  const top = axis(Math.max(4, ...data.map((d) => series.reduce((a, s) => a + (Number(d[s.key as keyof typeof d]) || 0), 0)))).top
  return (
    // แกน Y ปักซ้ายไม่เลื่อนตาม: วาดกราฟใบที่ 2 ทับไว้ซ้าย (โชว์เฉพาะแกน) แล้วบังกราฟจริงที่เลื่อนลอดข้างหลัง
    <div style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={margin} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickMargin={8}
                tick={{ fill: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--sans)' }}
                label={axisLabel ? { value: axisLabel, position: 'insideBottom', offset: -2, fill: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--sans)' } : undefined} />
              {/* แกน Y ปกติ (เส้นกริดอิงตัวนี้) — เวลาเลื่อน ตัวเลขจะลอดไปหลังใบที่ปักซ้ายซึ่งพื้นทึบ */}
              <YAxis domain={[0, top]} allowDecimals={false} width={32} tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--mono)' }} />
              <Tooltip cursor={{ fill: 'var(--surface-alt)' }}
                formatter={(v, name) => [`${fmtNum(Number(v) || 0)} ${unit}`, String(name)]}
                contentStyle={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--sans)', fontSize: 13,
                }}
                labelStyle={{ color: 'var(--text)', fontWeight: 500, marginBottom: 4 }} />
              {series.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} maxBarSize={28}
                  fillOpacity={focusOpacity(active ?? null, s.key)} isAnimationActive={false}
                  // มนเฉพาะชิ้นบนสุดของกอง
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined}>
                  {/* ชี้ที่ legend = ปักตัวเลขของชุดนั้นลงบนทุกแท่ง (ชุดเดียวกระจายอยู่ทุกวัน
                      ปัก tooltip จุดเดียวไม่ได้เหมือนกราฟรายแผนก) */}
                  {active === s.key && (
                    <LabelList dataKey={s.key} position="center"
                      formatter={(v) => (Number(v) > 0 ? fmtNum(Number(v)) : '')}
                      style={{ fill: 'var(--bg)', fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 600 }} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ใบแกน: กว้าง 32 (เท่าที่ YAxis กัน) พื้นทึบทับกราฟที่เลื่อนมา · ไม่รับคลิกให้ทะลุไปโดน tooltip ได้ */}
      <div aria-hidden className="pointer-events-none"
        style={{ position: 'absolute', left: 0, top: 0, width: 32, height, overflow: 'hidden', background: 'var(--bg)' }}>
        {/* ขนาดตายตัว ไม่ใช้ ResponsiveContainer — พ่อกว้าง 32 แต่ลูกต้อง 120 มันวัดได้ 0 */}
        <BarChart width={120} height={height} data={data} margin={margin} barCategoryGap="30%">
          <XAxis dataKey="label" tick={false} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis domain={[0, top]} allowDecimals={false} width={32} tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--mono)' }} />
          {/* ต้องมีชุดข้อมูลอย่างน้อย 1 ชิ้น recharts ถึงจะออก tick ให้ — วาดโปร่งใสไว้ */}
          <Bar dataKey={series[0].key} stackId="a" fill="none" isAnimationActive={false} />
        </BarChart>
      </div>
    </div>
  )
}

/** แถบสัดส่วนแนวนอน (ไม่มีแกน) — Figma หน้าหลัก: สัดส่วนเวร / สถานะการมาทำงาน */
export function SegmentBar({ segs, height = 24 }: { segs: Seg[]; height?: number }) {
  const total = segs.reduce((s, x) => s + x.v, 0)
  return (
    <div style={{ display: 'flex', height, borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface-card)' }}>
      {total > 0 && segs.filter((s) => s.v > 0).map((s, i) => (
        <div key={i} title={`${s.label ?? ''} ${fmtNum(s.v)}`} style={{ width: `${(s.v / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  )
}

/** โครงร่างกราฟแท่งกลุ่มระหว่างโหลด — สูงเท่า GroupedBars เป๊ะ การ์ดจึงไม่ยุบ/ยืดตอนสลับตัวกรอง */
export function GroupedBarsSkeleton({ groups = 5, series = 4, height = 320, unit = 'วัน' }: {
  groups?: number
  series?: number
  height?: number
  unit?: string
}) {
  // ความสูงแท่งคงที่ตามตำแหน่ง (ไม่สุ่ม) — ไม่งั้นสลับทุก render แล้วกระตุก
  const h = [0.85, 0.5, 0.7, 0.35, 0.6, 0.45, 0.75, 0.4]
  return (
    <div aria-busy="true" aria-label="กำลังโหลดกราฟ">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', minHeight: 28 }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>({unit})</span>
        <span style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 20 }}>
          {Array.from({ length: series }, (_, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="skel" style={{ width: 14, height: 14, borderRadius: 4 }} />
              <span className="skel" style={{ width: 56, height: 12 }} />
            </span>
          ))}
        </span>
      </div>
      <div style={{ height, display: 'flex', flexDirection: 'column' }}>
        {/* พื้นที่กราฟ: แกน Y + แท่ง */}
        <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
          <div style={{ width: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 30 }}>
            {Array.from({ length: 5 }, (_, i) => <span key={i} className="skel" style={{ width: 14, height: 10 }} />)}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
              {Array.from({ length: groups }, (_, gi) => (
                <div key={gi} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: '100%' }}>
                  {Array.from({ length: series }, (_, si) => (
                    <span key={si} className="skel" style={{ width: 18, height: `${h[(gi * series + si) % h.length] * 100}%`, borderRadius: '4px 4px 0 0' }} />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ height: 30, display: 'flex', alignItems: 'center' }}>
              {Array.from({ length: groups }, (_, i) => (
                <span key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <span className="skel" style={{ width: 58, height: 12 }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** กราฟแท่งกลุ่ม — Figma หน้ารายละเอียดพนักงาน node 95:25768 (สถิติแยกตามสัปดาห์)
    ใช้ recharts (ตัวเดียวในไฟล์นี้ที่ใช้ lib — กราฟอื่นเป็น CSS/SVG มือ ยังไม่ย้าย)
    legend มุมขวาบน (วาดเอง ไม่ใช่ของ recharts) · เส้นกริดประแนวนอน · แท่งมนหัว · กลุ่มเยอะเกินกล่อง -> เลื่อนแนวนอน */
export function GroupedBars({ groups, series, height = 320, unit = 'วัน', barWidth = 18 }: {
  groups: { label: string; values: Record<string, number> }[]
  series: { key: string; label: string; color: string }[]
  height?: number
  unit?: string
  barWidth?: number
}) {
  const data = groups.map((g) => ({ label: g.label, ...g.values }))
  // recharts ยืดเต็มกล่องเสมอ -> ตั้งความกว้างขั้นต่ำต่อกลุ่มเอง แล้วให้กล่องนอกเลื่อนแทน
  const minWidth = Math.max(320, groups.length * (series.length * (barWidth + 6) + 56))
  const [hi, setHi] = useState<string | null>(null)

  return (
    <div>
      {/* หน่วยซ้าย · legend ขวาบน — อยู่นอกกล่องเลื่อน จึงไม่ขยับตามตอน scroll แนวนอน
          (Legend ของ recharts อยู่ใน SVG ที่กว้างตามข้อมูล เลยเลื่อนตาม ต้องวาดเอง) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', minHeight: 28 }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>({unit})</span>
        <span style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 20 }}>
          {series.map((s) => (
            <span key={s.key} {...legendHover(setHi, s.key)}
              style={{
                position: 'relative',
                display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-dim)', whiteSpace: 'nowrap',
                opacity: hi == null || hi === s.key ? 1 : 0.5, transition: 'opacity .12s ease',
              }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: s.color, flex: 'none' }} />
              {s.label}
            </span>
          ))}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--border)' }}
                tick={{ fill: 'var(--text-dim)', fontSize: 14, fontFamily: 'var(--sans)' }} tickMargin={10} />
              <YAxis allowDecimals={false} width={36} tickLine={false} axisLine={{ stroke: 'var(--border)' }}
                tick={{ fill: 'var(--text-faint)', fontSize: 12, fontFamily: 'var(--mono)' }} />
              <Tooltip
                cursor={{ fill: 'var(--surface-alt)' }}
                formatter={(v, name) => [`${fmtNum(Number(v) || 0)} ${unit}`, String(name)]}
                contentStyle={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--sans)', fontSize: 13,
                }}
                labelStyle={{ color: 'var(--text)', fontWeight: 500, marginBottom: 4 }} />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={barWidth} radius={[4, 4, 0, 0]}
                  fillOpacity={focusOpacity(hi, s.key)} isAnimationActive={false}>
                  {/* ชี้ที่ legend = ปักตัวเลขของชุดนั้นไว้บนหัวแท่งทุกกลุ่ม */}
                  {hi === s.key && (
                    <LabelList dataKey={s.key} position="top"
                      formatter={(v) => (Number(v) > 0 ? fmtNum(Number(v)) : '')}
                      style={{ fill: 'var(--text)', fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 600 }} />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/** โดนัท conic-gradient + legend — ค่า 0 ทั้งหมดจะโชว์วงจาง */
export function Donut({ segs, centerLabel, centerValue, size = 120, pie, unit, legendSize = 12, stretch }: {
  segs: Seg[]
  centerLabel: string
  centerValue: string | number
  size?: number
  /** วงเต็ม ไม่เจาะรูตรงกลาง (Figma หน้ารายเวร: อัตราเข้างานแยกตามเวร) */
  pie?: boolean
  /** หน่วยต่อท้ายตัวเลขใน legend เช่น "คน" */
  unit?: string
  legendSize?: number
  /** ให้เต็มความสูงกล่องแล้วจัดกึ่งกลาง — ใช้ตอนวางคู่กับแผงที่สูงกว่า ไม่งั้นเหลือที่ว่างข้างล่างเยอะ */
  stretch?: boolean
}) {
  const total = segs.reduce((s, x) => s + x.v, 0)
  const [hi, setHi] = useState<number | null>(null)
  let acc = 0
  // ชี้ที่ legend = ชิ้นอื่นในวงถูกผสมกับพื้นให้จางลง (conic-gradient เจาะ opacity รายชิ้นไม่ได้)
  const stops = total > 0
    ? segs.map((s, i) => {
        const from = (acc / total) * 100
        acc += s.v
        const c = hi == null || hi === i ? s.color : `color-mix(in srgb, ${s.color} 22%, var(--surface))`
        return `${c} ${from.toFixed(2)}% ${((acc / total) * 100).toFixed(2)}%`
      }).join(', ')
    : 'var(--surface-gray) 0 100%'

  // เรขาคณิตของแต่ละชิ้น: path ไว้รับเมาส์ + จุดกลางชิ้นไว้ปัก tooltip
  //   conic-gradient เริ่มที่ 12 นาฬิกาแล้ววนตามเข็ม — มุมที่คำนวณตรงนี้ใช้ระบบเดียวกัน
  const R = size / 2
  const rIn = pie ? 0 : Math.round(size * 0.18)   // รูตรงกลางของโดนัท (inset เดียวกับการ์ดตัวเลขตรงกลาง)
  let deg = 0
  const arcs = segs.map((s) => {
    const a0 = deg
    const a1 = deg + (total > 0 ? (s.v / total) * 360 : 0)
    deg = a1
    const mid = (a0 + a1) / 2
    const [tx, ty] = polar(R, R, pie ? R * 0.62 : (R + rIn) / 2, mid)
    return { d: sectorPath(R, R, R, rIn, a0, a1), x: tx, y: ty, empty: a1 - a0 < 0.01 }
  })
  const hiSeg = hi != null && arcs[hi] && !arcs[hi].empty ? { seg: segs[hi], x: arcs[hi].x, y: arcs[hi].y } : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap', width: '100%',
      ...(stretch ? { height: '100%' } : null),
    }}>
      <div style={{ position: 'relative', width: size, height: size, flex: 'none', borderRadius: '50%', background: `conic-gradient(${stops})` }}>
        {!pie && (
          <div style={{ position: 'absolute', inset: Math.round(size * 0.18), borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{centerLabel}</span>
            <span style={{ fontSize: size >= 120 ? 21 : 18, fontWeight: 500, fontFamily: 'var(--mono)' }}>{centerValue}</span>
          </div>
        )}

        {/* พื้นที่รับเมาส์รายชิ้น — วงจริงเป็น conic-gradient (ชิ้นเดียวทั้งวง) เลยต้องซ้อน path โปร่งใสไว้จับ hover
            ชี้ที่ชิ้นไหน = เน้นชิ้นนั้น + ขึ้น tooltip เหมือนชี้ที่ legend */}
        {total > 0 && (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
            {arcs.map((a, i) => (
              <path key={i} d={a.d} fill="transparent" style={{ cursor: 'default' }}
                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
            ))}
          </svg>
        )}

        {/* tooltip ปักที่กลางชิ้นที่กำลังชี้ (ทรงเดียวกับ tooltip ของกราฟแท่ง) */}
        {hiSeg && (
          <span style={{
            position: 'absolute', left: hiSeg.x, top: hiSeg.y, transform: 'translate(-50%, -50%)',
            zIndex: 5, pointerEvents: 'none', whiteSpace: 'nowrap',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: 'var(--shadow-lg)', padding: '6px 10px',
            fontFamily: 'var(--sans)', fontSize: 13, textAlign: 'center',
          }}>
            <span style={{ display: 'block', fontWeight: 500, color: 'var(--text)' }}>{hiSeg.seg.label}</span>
            <span style={{ display: 'block', color: 'var(--text-dim)' }}>
              {fmtNum(hiSeg.seg.v)}{unit ? ` ${unit}` : ''} ({((hiSeg.seg.v / total) * 100).toFixed(1)}%)
            </span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 200px', minWidth: 120, maxWidth: stretch ? 360 : undefined }}>
        {segs.map((s, i) => (
          <div key={i} {...legendHover(setHi, i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, fontSize: legendSize,
              opacity: hi == null || hi === i ? 1 : 0.5, transition: 'opacity .12s ease',
            }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flex: 'none' }} />
            <span style={{ color: 'var(--text-dim)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {fmtNum(s.v)}{unit ? ` ${unit}` : ''}{total > 0 ? ` (${((s.v / total) * 100).toFixed(2)}%)` : ''}
            </span>
          </div>
        ))}
        {total === 0 && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ไม่มีข้อมูลในช่วงที่เลือก</span>}
      </div>
    </div>
  )
}

/** แถบเวลาบนแกน 24 ชั่วโมง — Figma หน้ารายเวร node 114:29745 (เปรียบเทียบเวลาเข้าเฉลี่ย)
    รางเทาเต็มความกว้าง = 00:00-24:00 · ส่วนที่ทึบ = เวลาเฉลี่ยของเวรนั้น */
export function DayTimeBars({ rows }: {
  rows: { label: string; minutes: number | null; value: string; color: string }[]
}) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>
              {r.label}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>{r.value}</span>
            </div>
            <div title={`${r.label} · ${r.value}`} style={{ height: 30, borderRadius: 6, background: 'var(--surface-card)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6, background: r.color,
                width: `${Math.min(100, Math.max(0, ((r.minutes ?? 0) / 1440) * 100))}%`,
                transition: 'width .3s',
              }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>ไม่มีข้อมูลในช่วงที่เลือก</span>}
      </div>
      {/* แกนเวลา 00:00-24:00 ทุก 6 ชม. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>
        {['00:00', '06:00', '12:00', '18:00', '24:00'].map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  )
}

/** กราฟเส้นแนวโน้ม (recharts) — เส้น + จุด + พื้นจาง แกน/tooltip ชุดเดียวกับกราฟอื่น
    จุดสุดท้ายทึบ ที่เหลือกลวง = ชี้ว่าค่าล่าสุดอยู่ตรงไหน */
export function TrendLine({ points, color = 'var(--accent)', height = 210, unit = 'นาที' }: {
  points: { label: string; v: number }[]
  color?: string
  height?: number
  unit?: string
}) {
  const last = points.length - 1
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickMargin={8}
            interval="preserveStartEnd" minTickGap={16}
            tick={{ fill: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--sans)' }} />
          <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={{ stroke: 'var(--border)' }}
            tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'var(--mono)' }} />
          <Tooltip cursor={{ stroke: 'var(--border)' }}
            formatter={(v) => [`${fmtNum(Number(v) || 0)} ${unit}`, '']}
            contentStyle={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--sans)', fontSize: 13,
            }}
            labelStyle={{ color: 'var(--text)', fontWeight: 500, marginBottom: 4 }} />
          <Area type="linear" dataKey="v" stroke={color} strokeWidth={2.5} fill={color} fillOpacity={0.1}
            activeDot={{ r: 5, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            dot={(p: { cx?: number; cy?: number; index?: number }) => (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} strokeWidth={2} stroke={color}
                fill={p.index === last ? color : 'var(--surface)'} />
            )} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap' }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 5, background: 'var(--surface-gray)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 5, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

/** จุดบนวงกลมจากมุมองศา (0 = 12 นาฬิกา วนตามเข็ม — ให้ตรงกับ conic-gradient) */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

/** path ของชิ้นพาย (rIn = 0) หรือชิ้นวงแหวนของโดนัท — ใช้เป็นพื้นที่รับเมาส์ */
function sectorPath(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  const sweep = a1 - a0
  if (sweep <= 0) return ''
  // ชิ้นเดียวเต็มวง: arc เดียว 360° จะยุบเป็นจุด ต้องผ่าเป็น 2 ครึ่ง
  if (sweep >= 359.99) {
    const half = sectorPath(cx, cy, rOut, rIn, a0, a0 + 180)
    return `${half} ${sectorPath(cx, cy, rOut, rIn, a0 + 180, a0 + 359.99)}`
  }
  const large = sweep > 180 ? 1 : 0
  const [x0, y0] = polar(cx, cy, rOut, a0)
  const [x1, y1] = polar(cx, cy, rOut, a1)
  if (rIn <= 0) return `M${cx} ${cy}L${x0} ${y0}A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1}Z`
  const [x2, y2] = polar(cx, cy, rIn, a1)
  const [x3, y3] = polar(cx, cy, rIn, a0)
  return `M${x0} ${y0}A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3}Z`
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
