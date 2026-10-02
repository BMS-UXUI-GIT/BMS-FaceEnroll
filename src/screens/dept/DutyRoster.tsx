import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useFetch } from '../../hooks'
import { filterQS } from '../../components/AttFilters'
import { thShort } from '../../components/DatePicker'
import { Loading } from '../../components/Spinner'
import { EmptyState, ErrorBox } from '../../components/feedback/Message'
import { SectionPanel } from '../../components/layout/SectionPanel'
import { Button } from '../../components/inputs/Button'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'
import { exportSheet } from '../../utils/exportx'
import { SHIFT_ICON, shiftKindOf, type ShiftKind } from '../../components/data-display/ShiftBadge'

// ตารางลงเวลารายวัน (คน × วัน) — แถว = พนักงาน · คอลัมน์ = วันที่
// ภาษาการออกแบบเดียวกับแอปมือถือ (branch mobile-app · DESIGN.md + widgets/week_day_strip.dart):
//   • หนึ่งวัน = หนึ่งวงสีทึบตามสถานะ (DayDot) · สีคือความหมาย: เขียว ปกติ · ส้ม สาย · ม่วง ออกก่อน · แดง ลืมออก/นอกพื้นที่
//   • สองเวรในวันเดียว = วงผ่าครึ่งทแยง (SplitDot) บนซ้ายเวรแรก ล่างขวาเวรที่สอง คั่นด้วยเส้นขาว
//   • วันที่ไม่มีเวร = วงเทาเปล่า · วันนี้ = ขอบน้ำเงิน (สีในวงถูกใช้บอกสถานะไปแล้ว)
//   • legend แถวเดียว: เวร (เช้า/บ่าย/ดึก + Day/Night ถ้ามี) · พัก · หยุด · สีสถานะ
//   ต่อจากแอป: ไอคอนเวรจิ๋วมุมขวาล่างของวง (ไอคอนเดียวกับ ShiftBadge) — ตารางทั้งแผนกต้องอ่านเวรได้โดยไม่ต้องแตะทีละวัน
//
// ⚠️ ระบบยังไม่มีตารางเวรล่วงหน้า (รอเชื่อม HR) — วงเทาแปลว่าไม่มีการสแกน ไม่ใช่ขาดงาน

type Emp = { emp: string; name: string; dept: string; position?: string }
type EmpList = { rows: Emp[]; total?: number }
type Punch = {
  emp: string; name: string; dept: string; date: string; seq?: number
  in: string; out: string; shift: string
  late: boolean; early: boolean; no_out: boolean; out_area?: boolean; late_min?: number; early_min?: number
}
type Daily = { rows: Punch[]; total?: number }

const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
// ดึงทีละก้อนใหญ่ — ตารางต้องเห็นทุกคนทุกวันพร้อมกัน แบ่งหน้าไม่ได้
const MAX_ROWS = 5000

/** อักษรย่อเวรแบบตารางเวรไทย — แยกเวรด้วย shiftKindOf ตัวเดียวกับป้ายเวรทั้งระบบ */
const CODE: Record<ShiftKind, string> = { morning: 'ช', afternoon: 'บ', night: 'ด' }
const shiftCode = (s: string) => { const k = rosterShiftOf(s); return k === 'day' ? 'D' : k === 'dnight' ? 'N' : CODE[k] }
const shiftShort = (s: string) => s.split(' ')[0] || s

/** ชนิดเวรในตาราง — เช้า/บ่าย/ดึก (ชุดเดียวกับ ShiftBadge) + เวร 12 ชม. Day/Night ที่บาง รพ. ใช้แทน
    Day/Night โผล่ใน legend เฉพาะเมื่อมีจริงในข้อมูลช่วงนั้น */
type RosterShift = ShiftKind | 'day' | 'dnight'
const rosterShiftOf = (name: string): RosterShift =>
  /กลางวัน|\bday\b/i.test(name) ? 'day' : /กลางคืน|\bnight\b/i.test(name) ? 'dnight' : shiftKindOf(name)
const PIP: Record<RosterShift, { label: string; icon: string; color: string }> = {
  morning: { label: 'เช้า', icon: SHIFT_ICON.morning, color: 'var(--shift-morning-icon)' },
  afternoon: { label: 'บ่าย', icon: SHIFT_ICON.afternoon, color: 'var(--shift-afternoon-icon)' },
  night: { label: 'ดึก', icon: SHIFT_ICON.night, color: 'var(--shift-night-icon)' },
  day: { label: 'Day', icon: 'sun-plain', color: 'var(--shift-day-icon)' },
  dnight: { label: 'Night', icon: 'moon-plain', color: 'var(--shift-dnight-icon)' },
}
const PIP_ORDER: RosterShift[] = ['morning', 'afternoon', 'night', 'day', 'dnight']

/** สถานะของหนึ่งเวร — ลำดับความรุนแรงเดียวกับ markOf ในแอป: ลืมออก/นอกพื้นที่ > ออกก่อน > สาย > ปกติ */
type Mark = 'ok' | 'late' | 'early' | 'bad'
/** ชุดชิปของ legend — ตรงกับ ChartLegendBar ในแอปหนึ่งต่อหนึ่ง (รวม "ไม่มีเวร") */
type Series = Mark | 'none'
const markOf = (p: Punch): Mark => (p.no_out || p.out_area ? 'bad' : p.early ? 'early' : p.late ? 'late' : 'ok')
const SERIES: { key: Series; label: string; color: string }[] = [
  { key: 'ok', label: 'ปกติ', color: 'var(--ok)' },
  { key: 'late', label: 'สาย', color: 'var(--warn)' },
  { key: 'early', label: 'ออกก่อน', color: 'var(--info)' },
  { key: 'bad', label: 'ลืมออก/นอกพื้นที่', color: 'var(--danger)' },
  { key: 'none', label: 'ไม่มีเวร', color: 'color-mix(in srgb, var(--text) 14%, transparent)' },
]
const COLOR = Object.fromEntries(SERIES.map((x) => [x.key, x.color])) as Record<Series, string>
/** ข้อความต่อท้ายใน Excel — เขียนสีพื้นเซลล์ไม่ได้ สถานะจึงต้องเป็นตัวหนังสือ */
const XLS_TAG: Record<Mark, string> = { ok: '', late: ' สาย', early: ' ออกก่อน', bad: ' ลืมออก/นอกพื้นที่' }

const dateList = (from: string, to: string) => {
  const out: string[] = []
  for (let d = new Date(`${from}T00:00:00`); ; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (iso > to || out.length > 62) break
    out.push(iso)
  }
  return out
}
const dow = (iso: string) => new Date(`${iso}T00:00:00`).getDay()
const isWeekend = (iso: string) => dow(iso) === 0 || dow(iso) === 6

const tipOf = (p: Punch) =>
  `${shiftShort(p.shift)} ${p.in ? p.in.slice(0, 5) : '—'}–${p.no_out || !p.out ? 'ไม่สแกนออก' : p.out.slice(0, 5)}`
  + (p.late ? ` · สาย ${p.late_min ?? ''} นาที` : '')
  + (p.early ? ` · ออกก่อน ${p.early_min ?? ''} นาที` : '')
  + (p.out_area ? ' · สแกนนอกพื้นที่' : '')

const DOT = 26

/** วงของหนึ่งวัน (DayDot + SplitDot ของแอป)
    marks ว่าง = วงเทาเปล่า · 1 ตัว = วงทึบสีเดียว · 2 ตัว = ผ่าครึ่งทแยงคั่นเส้นขาว
    ต่างจากแอปตรงที่ผ่าครึ่งเสมอแม้สองเวรสถานะเดียวกัน — ในตารางต้องเห็นว่าวันนั้นมีสองเวร */
/** ไอคอนเวรจิ๋วเกาะมุมขวาล่างของวง — ไอคอน/สีชุดเดียวกับ ShiftBadge (เช้า haze · บ่าย sun · ดึก moon)
    ขอบสีพื้นรอบไอคอนตัดให้แยกจากวงสถานะ ไม่ปนเป็นก้อนเดียว */
function ShiftPip({ kind, style }: { kind: RosterShift; style?: CSSProperties }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', width: 13, height: 13, borderRadius: 'var(--r-full)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: PIP[kind].color, color: '#fff',
      boxShadow: '0 0 0 1.5px var(--surface)', ...style,
    }}>
      <Icon name={PIP[kind].icon} size={9} width={2.2} />
    </span>
  )
}

function DayDot({ marks, shifts, today, blank, title, size = DOT }: {
  marks: Mark[]; shifts: RosterShift[]; today?: boolean; blank?: boolean; title?: string; size?: number
}) {
  const [a, b] = marks
  const fill = !a
    ? (blank ? 'transparent' : COLOR.none)
    : !b
      ? COLOR[a]
      // "to bottom right" = เส้นแบ่งวิ่งจากมุมขวาบนลงมุมซ้ายล่าง แบบ SplitDot
      : `linear-gradient(to bottom right, ${COLOR[a]} calc(50% - .75px), #fff calc(50% - .75px) calc(50% + .75px), ${COLOR[b]} calc(50% + .75px))`
  return (
    // คีย์ = สีที่กำลังวาด → เปลี่ยนสถานะ/กรอง legend แล้ววงไล่โผล่ใหม่ (dot-pop) แทนการสลับวูบ
    <span key={marks.join('|') || (blank ? 'blank' : 'empty')} title={title} className="dot-pop" style={{
      position: 'relative', width: size, height: size, flex: 'none', display: 'inline-block', verticalAlign: 'middle',
      borderRadius: 'var(--r-full)', background: fill,
      // วันนี้ = ขอบ ไม่ใช่สี (เหมือนแอป) — ใช้ box-shadow จะได้ไม่ดันขนาดวง
      boxShadow: today ? '0 0 0 2px var(--surface), 0 0 0 3.5px var(--accent)' : undefined,
    }}>
      {/* เวรของวง — มุมขวาล่าง · สองเวรเรียงซ้าย→ขวา = เวรแรก→เวรที่สอง (ทิศเดียวกับครึ่งวง) */}
      {a && shifts[1] && b && <ShiftPip kind={shifts[0]} style={{ right: 6, bottom: -4 }} />}
      {a && <ShiftPip kind={shifts[b ? 1 : 0]} style={{ right: -4, bottom: -4 }} />}
    </span>
  )
}

/** ช่องของ 1 คน 1 วัน */
function Cell({ ps, date, today }: { ps: Punch[]; date: string; today: boolean }) {
  const shown = ps.slice(0, 2)
  const tip = ps.length ? `${thShort(date)}\n${ps.map(tipOf).join('\n')}` : `${thShort(date)} · ไม่มีการลงเวลา`
  return (
    <DayDot marks={shown.map(markOf)} shifts={shown.map((p) => rosterShiftOf(p.shift))}
      today={today} title={tip} />
  )
}

const NAME_W = 200
const DAY_W = 42

export function DutyRoster({ hcode, from, to, depts, deptLabel, reload, deptName }: {
  hcode: string
  from: string
  to: string
  /** แผนกที่เลือก (ชื่อที่แสดง) — ว่าง = ทุกแผนก */
  depts: string[]
  /** ป้ายสรุปแผนกที่เลือก ใช้ทั้งหัวแผงและหัวไฟล์ Excel */
  deptLabel: string
  reload: number
  deptName: (d: string) => string
}) {
  const q = `hcode=${encodeURIComponent(hcode)}`
  // ส่งตัวกรองแผนกให้ backend ด้วยเมื่อทำได้ (ข้อมูลน้อยลงมาก) — "ไม่ระบุแผนก" ส่งเป็นค่าว่างไม่ได้ เลยกรองฝั่งหน้าเว็บแทน
  const serverDepts = depts.length && !depts.includes(deptName('')) ? depts : []
  const empF = useFetch<EmpList>(hcode ? `/admin/employees?${q}&limit=${MAX_ROWS}&offset=0` : null, reload)
  const dayF = useFetch<Daily>(hcode
    ? `/admin/attendance/daily?${q}&date_from=${from}&date_to=${to}&limit=${MAX_ROWS}&offset=0${filterQS([], serverDepts)}`
    : null, reload)
  const [busy, setBusy] = useState(false)

  const days = useMemo(() => dateList(from, to), [from, to])
  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const view = useMemo(() => {
    const inDept = (d: string) => !depts.length || depts.includes(deptName(d))
    const staff = (empF.data?.rows ?? []).filter((e) => inDept(e.dept))
    // emp -> date -> รอบที่สแกน (เรียงตามรอบ)
    const map = new Map<string, Map<string, Punch[]>>()
    for (const p of dayF.data?.rows ?? []) {
      if (!inDept(p.dept)) continue
      let m = map.get(p.emp)
      if (!m) { m = new Map(); map.set(p.emp, m) }
      const arr = m.get(p.date) ?? []
      arr.push(p)
      m.set(p.date, arr)
    }
    for (const m of map.values()) for (const arr of m.values()) arr.sort((a, b) => (a.seq ?? 1) - (b.seq ?? 1))
    // คนที่สแกนแต่ไม่อยู่ในรายชื่อพนักงาน (เช่นรายชื่อถูกตัดที่ limit) — ยังต้องโผล่ในตาราง
    const known = new Set(staff.map((e) => e.emp))
    for (const p of dayF.data?.rows ?? []) {
      if (inDept(p.dept) && !known.has(p.emp)) { known.add(p.emp); staff.push({ emp: p.emp, name: p.name, dept: p.dept }) }
    }
    staff.sort((a, b) => deptName(a.dept).localeCompare(deptName(b.dept), 'th') || a.name.localeCompare(b.name, 'th'))
    const present = days.map((d) => staff.filter((e) => (map.get(e.emp)?.get(d)?.length ?? 0) > 0).length)
    const kinds = new Set((dayF.data?.rows ?? []).map((p) => rosterShiftOf(p.shift)))
    return { staff, map, present, kinds }
  }, [empF.data, dayF.data, depts, deptName, days])

  const grouped = new Set(view.staff.map((e) => deptName(e.dept))).size > 1
  const truncated = (dayF.data?.total ?? 0) > (dayF.data?.rows?.length ?? 0)
  const loading = (empF.loading || dayF.loading) && !(empF.data && dayF.data)
  const err = empF.err || dayF.err

  const exportXlsx = async () => {
    setBusy(true)
    try {
      const head = ['รหัส', 'ชื่อ-นามสกุล', 'แผนก', 'ตำแหน่ง', ...days.map((d) => String(Number(d.slice(8)))), 'วันที่มา', 'มาสาย (ครั้ง)', 'ออกก่อน (ครั้ง)', 'ไม่สแกนออก (ครั้ง)']
      const pad = ['', '', '', '']
      const tail = ['', '', '', '']
      const body = view.staff.map((e) => {
        const m = view.map.get(e.emp)
        const all = [...(m?.values() ?? [])].flat()
        return [
          e.emp, e.name, deptName(e.dept), e.position ?? '',
          ...days.map((d) => {
            const ps = m?.get(d) ?? []
            return ps.length ? ps.map((p) => shiftCode(p.shift) + XLS_TAG[markOf(p)]).join(' / ') : '-'
          }),
          m?.size ?? 0,
          all.filter((p) => p.late).length,
          all.filter((p) => p.early).length,
          all.filter((p) => p.no_out).length,
        ]
      })
      const aoa: (string | number)[][] = [
        [`ตารางลงเวลารายวัน — ${deptLabel}`],
        [`ช่วงวันที่ ${thShort(from)} – ${thShort(to)} · ทั้งหมด ${view.staff.length} คน`],
        [],
        head,
        [...pad, ...days.map((d) => WD[dow(d)]), ...tail],
        ['', 'ลงเวลา (มา/ทั้งหมด)', '', '', ...view.present.map((n) => `${n}/${view.staff.length}`), ...tail],
        ...body,
        [],
        ['คำอธิบาย'],
        ['', 'ช = เวรเช้า · บ = เวรบ่าย · ด = เวรดึก (เวรที่สแกนเข้าจริง)'],
        ['', 'ต่อท้าย "สาย" = มาสาย · "ออกก่อน" = ออกก่อนเวลา · "ไม่สแกนออก" = ลืมสแกนออก · ไม่มีคำต่อท้าย = ตรงเวลา'],
        ['', 'ช่องที่มี " / " = ควบเวรในวันเดียวกัน · "-" = ไม่มีการลงเวลา (ยังไม่ใช่การขาดงาน — ระบบยังไม่มีตารางเวร)'],
      ]
      const last = head.length
      await exportSheet({
        sheet: 'ตารางลงเวลา',
        aoa,
        cols: [10, 24, 18, 20, ...days.map(() => 9), 9, 12, 13, 15],
        merges: [{ r: 0, c: 0, cols: last }, { r: 1, c: 0, cols: last }],
        filename: `ตารางลงเวลารายวัน-${from}_${to}.xlsx`,
      })
    } finally {
      setBusy(false)
    }
  }

  // หัวตาราง/คอลัมน์ชื่อ ติดขอบตอนเลื่อน — ต้องมีพื้นทึบ ไม่งั้นช่องที่เลื่อนลอดจะทะลุขึ้นมา
  const headCell: CSSProperties = {
    position: 'sticky', top: 0, zIndex: 2, background: 'var(--table-head-bg)',
    borderBottom: '1px solid var(--control-border)', borderRight: '1px solid var(--control-border)',
    textAlign: 'center', padding: '4px 2px', minWidth: DAY_W, width: DAY_W, boxSizing: 'border-box',
  }
  // แถวหัวชั้นแรกสูงตายตัว — แถวชั้น 2 ใช้ค่านี้เป็นระยะ sticky top ของตัวเอง
  const HEAD_H = 50
  const nameCell: CSSProperties = {
    position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)', textAlign: 'left',
    minWidth: NAME_W, width: NAME_W, maxWidth: NAME_W, padding: '6px 12px',
    borderRight: '1px solid var(--control-border)', borderBottom: '1px solid var(--control-border)',
  }
  const dayCell = (d: string): CSSProperties => ({
    textAlign: 'center', padding: '5px 2px', height: 40,
    borderRight: '1px solid var(--control-border)', borderBottom: '1px solid var(--control-border)',
    background: isWeekend(d) ? 'var(--surface-alt)' : undefined,
  })

  let lastDept = ''
  return (
    <SectionPanel
      title="ตารางลงเวลารายวัน"
      meta={`${thShort(from)} – ${thShort(to)} · ${deptLabel}`}
      actions={
        <Button variant="secondary" size="md" pill onClick={exportXlsx} disabled={busy || loading || view.staff.length === 0}
          icon={<Icon name="download" size={18} width={1.8} />}>
          {busy ? 'กำลังส่งออก…' : 'ส่งออก Excel'}
        </Button>
      }>
      {err ? <ErrorBox>ผิดพลาด: {err}</ErrorBox>
        : loading ? <Loading />
          : view.staff.length === 0 ? <EmptyState text="ไม่มีพนักงานในแผนกที่เลือก" />
            : (
              <>
                {truncated && (
                  <p style={{ ...TEXT.sm, color: 'var(--warn)', margin: '0 0 var(--sp-2)' }}>
                    ข้อมูลช่วงนี้มีมากกว่า {MAX_ROWS.toLocaleString()} รายการ ตารางแสดงไม่ครบ — ลองเลือกแผนกหรือย่อช่วงวัน
                  </p>
                )}
                <div className="rounded-lg" style={{ border: '1px solid var(--control-border)', overflow: 'auto', maxHeight: 600 }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, ...TEXT.sm, color: 'var(--table-row-text)' }}>
                    <thead>
                      <tr>
                        <th style={{ ...headCell, ...nameCell, zIndex: 3, top: 0, height: HEAD_H, background: 'var(--table-head-bg)', ...TEXT.bodyMed, color: 'var(--text)' }}>
                          ชื่อพนักงาน
                        </th>
                        {days.map((d) => (
                          <th key={d} style={{ ...headCell, height: HEAD_H, background: isWeekend(d) ? 'color-mix(in srgb, var(--table-head-bg), var(--text) 6%)' : 'var(--table-head-bg)' }}>
                            {/* วันนี้ = สีน้ำเงินที่ตัวอักษร (แบบแถบวันของแอป) — พื้นวงเก็บไว้ใช้บอกสถานะอย่างเดียว */}
                            <span style={{ display: 'block', ...TEXT.bodyMed, color: d === today ? 'var(--accent-active)' : 'var(--text)', fontWeight: d === today ? 700 : undefined }}>
                              {Number(d.slice(8))}
                            </span>
                            <span style={{ display: 'block', fontSize: 10.5, color: d === today ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 400 }}>{WD[dow(d)]}</span>
                          </th>
                        ))}
                      </tr>
                      {/* แถวหัวชั้น 2 ติดใต้แถวแรก */}
                      <tr>
                        <th style={{ ...headCell, ...nameCell, zIndex: 3, top: HEAD_H, background: 'var(--surface-alt)', fontWeight: 400, fontSize: 11.5, color: 'var(--text-dim)' }}>
                          ลงเวลา (มา/ทั้งหมด)
                        </th>
                        {days.map((d, i) => (
                          <th key={d} style={{
                            ...headCell, top: HEAD_H, background: 'var(--surface-alt)', fontWeight: 500, fontSize: 11,
                            color: view.present[i] === view.staff.length ? 'var(--ok)' : 'var(--text-dim)',
                          }}>
                            {view.present[i]}/{view.staff.length}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {view.staff.map((e) => {
                        const dn = deptName(e.dept)
                        const sep = grouped && dn !== lastDept
                        lastDept = dn
                        const m = view.map.get(e.emp)
                        return [
                          sep && (
                            <tr key={`h:${dn}`}>
                              <td style={{ ...nameCell, background: 'var(--surface-alt)', ...TEXT.bodyMed, color: 'var(--text)' }}>{dn}</td>
                              <td colSpan={days.length} style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--control-border)' }} />
                            </tr>
                          ),
                          <tr key={e.emp} className="row-hover">
                            <td style={nameCell}>
                              <span style={{ display: 'block', ...TEXT.bodyMed, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {e.position || e.emp}
                              </span>
                            </td>
                            {days.map((d) => (
                              <td key={d} style={dayCell(d)}><Cell ps={m?.get(d) ?? []} date={d} today={d === today} /></td>
                            ))}
                          </tr>,
                        ]
                      })}
                    </tbody>
                  </table>
                </div>

                {/* legend แถวเดียว: เวร (ไอคอนมุมขวาล่างของวง) · พัก · หยุด | สีของวง = สถานะการลงเวลา */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px', marginTop: 'var(--sp-3)', fontSize: 12, color: 'var(--text-dim)' }}>
                  {PIP_ORDER.filter((k) => k === 'morning' || k === 'afternoon' || k === 'night' || view.kinds.has(k)).map((k) => (
                    <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ position: 'relative', width: 13, height: 13 }}><ShiftPip kind={k} style={{ left: 0, top: 0 }} /></span>
                      {PIP[k].label}
                    </span>
                  ))}
                  <span title="ไม่มีการลงเวลาในวันนั้น — ยังไม่ใช่การขาดงาน เพราะระบบยังไม่มีตารางเวรล่วงหน้า"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'help' }}>
                    <span style={{ width: 13, height: 13, borderRadius: 'var(--r-full)', background: COLOR.none }} />พัก
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--surface-alt)', border: '1px solid var(--control-border)' }} />หยุด
                  </span>
                  <span aria-hidden style={{ width: 1, height: 14, background: 'var(--control-border)' }} />
                  {SERIES.filter((x) => x.key !== 'none').map((x) => (
                    <span key={x.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', background: x.color }} />{x.label}
                    </span>
                  ))}
                </div>
              </>
            )}
    </SectionPanel>
  )
}
