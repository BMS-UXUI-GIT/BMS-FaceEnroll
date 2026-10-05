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
import { Tip } from '../../components/Info'
import { SHIFT_ICON, shiftKindOf, type ShiftKind } from '../../components/data-display/ShiftBadge'

// ตารางลงเวลารายวัน (คน × วัน) — แถว = พนักงาน · คอลัมน์ = วันที่
// ภาษาการออกแบบเดียวกับแอปมือถือ (branch mobile-app · DESIGN.md + widgets/month_heatmap.dart):
//   • หนึ่งวัน = หนึ่งช่อง สถานะบอกด้วยเส้นขอบ + พื้นจาง ๆ สีเดียวกัน: เขียว ปกติ · แดง ผิดปกติ
//     ผิดปกติแบบไหน (สาย/ออกก่อน/ไม่สแกนออก/นอกพื้นที่) บอกตอนชี้ และเขียนครบใน Excel
//     (เดิมเป็นวงกลมเล็กสีเข้ม 4 สถานะ — ผู้ใช้บอกอ่านยากและแยกละเอียดเกินไป)
//   • สองเวรในวันเดียว = ขอบบน+ซ้ายสีเวรแรก · ขอบขวา+ล่างสีเวรที่สอง + เส้นทแยงจาง ๆ
//   • ไอคอนเวร (เช้า/บ่าย/ดึก/Day/Night) สีโทนเข้มของเวร ไม่มีวงรอง กลางช่อง (สองเวร = กลางครึ่งของตัวเอง)
//   • วันที่ไม่มีเวร = ช่องเทา · วันนี้ = ขอบน้ำเงิน (สีในช่องเก็บไว้บอกสถานะอย่างเดียว)
//   • legend แถวเดียว: เวร (เช้า/บ่าย/ดึก + Day/Night ถ้ามี) · พัก · หยุด · สีสถานะ
//
// ⚠️ ระบบยังไม่มีตารางเวรล่วงหน้า (รอเชื่อม HR) — ช่องเทาแปลว่าไม่มีการสแกน ไม่ใช่ขาดงาน

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
  morning: { label: 'เช้า', icon: SHIFT_ICON.morning, color: 'var(--shift-morning-text)' },
  afternoon: { label: 'บ่าย', icon: SHIFT_ICON.afternoon, color: 'var(--shift-afternoon-text)' },
  night: { label: 'ดึก', icon: SHIFT_ICON.night, color: 'var(--shift-night-text)' },
  day: { label: 'Day', icon: 'sun-plain', color: 'color-mix(in srgb, var(--shift-day-icon) 70%, #000)' },
  dnight: { label: 'Night', icon: 'moon-plain', color: 'var(--shift-dnight-icon)' },
}
const PIP_ORDER: RosterShift[] = ['morning', 'afternoon', 'night', 'day', 'dnight']

/** สถานะของหนึ่งเวรบนตาราง — แค่ปกติ/ผิดปกติ (ผู้ใช้ขอไม่ให้แยกสีละเอียด)
    ผิดปกติแบบไหนบอกตอนชี้ (tooltip) และเขียนครบในไฟล์ Excel */
type Mark = 'ok' | 'bad'
/** รายการความผิดปกติของหนึ่งเวร — ใช้ทั้ง tooltip และ Excel (ว่าง = ปกติ) */
const issuesOf = (p: Punch): string[] => [
  ...(p.late ? [`มาสาย ${p.late_min ?? ''} นาที`.replace('  ', ' ')] : []),
  ...(p.early ? [`ออกก่อน ${p.early_min ?? ''} นาที`.replace('  ', ' ')] : []),
  ...(p.no_out ? ['ไม่สแกนออก'] : []),
  ...(p.out_area ? ['สแกนนอกพื้นที่'] : []),
]
const markOf = (p: Punch): Mark => (issuesOf(p).length ? 'bad' : 'ok')
// สีอ่อน — ระบายเต็มช่องทั้งตาราง สีเข้มเต็มที่แสบตาและกลบไอคอนเวร
// สถานะบอกด้วย "เส้นขอบ" (ผู้ใช้ขอ) — พื้นช่องเรียบทุกช่อง ขอบเขียว = ปกติ · ขอบแดง = ผิดปกติ · พัก = พื้นเทาไม่มีขอบ
// เดิมระบายสีเต็มช่อง ลองมาหลายความเข้มแล้วดูยากทุกแบบ
const tone = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, var(--surface))`
const LINE: Record<Mark, string> = { ok: 'var(--ok)', bad: 'var(--danger)' }
/** พื้นจาง ๆ ด้านในตามสถานะ — คู่กับเส้นขอบ */
const TINT: Record<Mark, string> = { ok: tone('var(--ok)', 10), bad: tone('var(--danger)', 12) }
const REST = tone('var(--text)', 9)
const BORDER = 2
const SERIES: { key: Mark; label: string; tip?: string }[] = [
  { key: 'ok', label: 'ปกติ' },
  { key: 'bad', label: 'ผิดปกติ', tip: 'มาสาย · ออกก่อน · ไม่สแกนออก · สแกนนอกพื้นที่ — ชี้ที่ช่องเพื่อดูว่าเป็นแบบไหน' },
]

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

/** ไอคอนเวร — ไอคอนล้วน ไม่มีวงรอง สีโทนเข้มของเวร (ชุดเดียวกับ ShiftBadge)
    กลางช่อง ขนาด 18 — เดิมอยู่มุมช่อง 14px สีอ่อน ผู้ใช้บอกดูยาก */
function ShiftPip({ kind, size = 18, style }: { kind: RosterShift; size?: number; style?: CSSProperties }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', width: size, height: size, display: 'inline-flex', color: PIP[kind].color, ...style,
    }}>
      <Icon name={PIP[kind].icon} size={size} width={2.2} />
    </span>
  )
}

/** ช่องของ 1 คน 1 วัน — ระบายสีเต็มช่อง (แบบช่องปฏิทินใน month_heatmap ของแอป ไม่ใช่วงกลมเล็ก)
    สองเวร = ผ่าครึ่งทแยงแบบ SplitBox: ครึ่งบนซ้ายเวรแรก ไอคอนเวรแรกอยู่มุมบนซ้าย ·
    ครึ่งล่างขวาเวรที่สอง ไอคอนอยู่มุมล่างขวา — ไอคอนอยู่ในครึ่งของตัวเอง อ่านคู่กันได้ทันที */
function DayBlock({ marks, shifts, today, sample }: {
  marks: Mark[]; shifts: RosterShift[]; today?: boolean
  /** ใช้ใน legend — กล่องเล็กขนาดตายตัวแทนการยืดเต็มช่อง */
  sample?: number
}) {
  const [a, b] = marks
  // สองเวร: ขอบบน+ซ้าย = เวรแรก · ขอบขวา+ล่าง = เวรที่สอง — มุมที่สองสีมาชนกัน (ขวาบน/ซ้ายล่าง)
  // ตรงกับแนวผ่าครึ่งพอดี จึงอ่านเป็นสองครึ่งเหมือนเดิม
  const color = !a ? undefined : !b ? LINE[a] : `${LINE[a]} ${LINE[b]} ${LINE[b]} ${LINE[a]}`
  return (
    // คีย์ = สีที่กำลังวาด → เปลี่ยนข้อมูลแล้วช่องไล่โผล่ใหม่ (dot-pop) แทนการสลับวูบ
    <span key={marks.join('|') || 'empty'} className="dot-pop" style={{
      position: 'relative', display: 'block', boxSizing: 'border-box', borderRadius: 6,
      background: !a ? REST : !b ? TINT[a] : undefined,
      border: a ? `${BORDER}px solid` : undefined, borderColor: color,
      width: sample ?? '100%', height: sample ?? '100%',
      // วันนี้ = ขอบนอกสีน้ำเงิน (เว้นระยะจากขอบสถานะ) — ไม่ปนกับสีสถานะ
      outline: today ? '2px solid var(--accent)' : undefined, outlineOffset: 2,
    }}>
      {/* สองเวร: พื้นจางคนละครึ่ง + เส้นทแยงจาง ๆ (SVG ขอบเนียน ไม่หยักแบบ CSS gradient) */}
      {a && b && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', borderRadius: 4 }}>
          <polygon points="0,0 100,0 0,100" style={{ fill: TINT[a] }} />
          <polygon points="100,0 100,100 0,100" style={{ fill: TINT[b] }} />
          <line x1="100" y1="0" x2="0" y2="100" stroke="var(--control-border)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {!sample && a && (b
        ? <>
            <ShiftPip kind={shifts[0]} size={14} style={{ left: '30%', top: '30%', transform: 'translate(-50%, -50%)' }} />
            <ShiftPip kind={shifts[1]} size={14} style={{ left: '70%', top: '70%', transform: 'translate(-50%, -50%)' }} />
          </>
        : <ShiftPip kind={shifts[0]} style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />)}
    </span>
  )
}

const WD_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

/** การ์ดตอนชี้ช่อง — วันที่ + ชื่อ แล้วไล่ทีละเวร: ไอคอนเวร · เวลาเข้า–ออก · ป้ายปกติ/ผิดปกติ · ผิดปกติแบบไหน */
function CellTip({ ps, date, name }: { ps: Punch[]; date: string; name: string }) {
  return (
    <span style={{ display: 'block', minWidth: 230 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{WD_FULL[dow(date)]} {thShort(date)}</span>
        <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      </span>
      {ps.length === 0 ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: REST, flex: 'none' }} />
          พัก — ไม่มีการลงเวลาในวันนี้
        </span>
      ) : ps.map((p, i) => {
        const iss = issuesOf(p)
        const k = rosterShiftOf(p.shift)
        return (
          <span key={i} style={{
            display: 'block', padding: '8px 10px', borderRadius: 8, marginTop: i ? 6 : 0,
            // แบบเดียวกับช่องในตาราง — พื้นเรียบ ขอบสีสถานะ
            background: TINT[iss.length ? 'bad' : 'ok'], color: 'var(--text)', border: `${BORDER}px solid ${LINE[iss.length ? 'bad' : 'ok']}`,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ position: 'relative', width: 16, height: 16, flex: 'none' }}><ShiftPip kind={k} size={16} style={{ left: 0, top: 0 }} /></span>
              <span style={{ ...TEXT.bodyMed, color: 'inherit' }}>{p.shift}</span>
              <span style={{
                marginLeft: 'auto', padding: '1px 8px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 600,
                background: 'var(--surface)', color: LINE[iss.length ? 'bad' : 'ok'],
              }}>{iss.length ? 'ผิดปกติ' : 'ปกติ'}</span>
            </span>
            <span style={{ display: 'block', marginTop: 4, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              เข้า {p.in ? p.in.slice(0, 5) : '—'} · ออก {p.no_out || !p.out ? '—' : p.out.slice(0, 5)}
            </span>
            {iss.map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, color: 'var(--danger)', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: 'var(--r-full)', background: 'currentColor', flex: 'none' }} />{t}
              </span>
            ))}
          </span>
        )
      })}
    </span>
  )
}

/** ช่องของ 1 คน 1 วัน */
function Cell({ ps, date, today, name }: { ps: Punch[]; date: string; today: boolean; name: string }) {
  const shown = ps.slice(0, 2)
  return (
    <Tip card width={300} text={<CellTip ps={ps} date={date} name={name} />} className="roster-cell"
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}>
      <DayBlock marks={shown.map(markOf)} shifts={shown.map((p) => rosterShiftOf(p.shift))} today={today} />
    </Tip>
  )
}

const NAME_W = 200
const DAY_W = 46

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
      const head = ['รหัส', 'ชื่อ-นามสกุล', 'แผนก', 'ตำแหน่ง', ...days.map((d) => String(Number(d.slice(8)))),
        'วันที่มา', 'ผิดปกติ (ครั้ง)', 'มาสาย (ครั้ง)', 'ออกก่อน (ครั้ง)', 'ไม่สแกนออก (ครั้ง)', 'นอกพื้นที่ (ครั้ง)']
      const pad = ['', '', '', '']
      const tail = ['', '', '', '', '', '']
      const body = view.staff.map((e) => {
        const m = view.map.get(e.emp)
        const all = [...(m?.values() ?? [])].flat()
        return [
          e.emp, e.name, deptName(e.dept), e.position ?? '',
          ...days.map((d) => {
            const ps = m?.get(d) ?? []
            // ปกติ = ตัวย่อเวรอย่างเดียว · ผิดปกติ = ตัวย่อ + รายละเอียดในวงเล็บ
            return ps.length
              ? ps.map((p) => { const iss = issuesOf(p); return shiftCode(p.shift) + (iss.length ? ` (${iss.join(', ')})` : '') }).join(' / ')
              : 'พัก'
          }),
          m?.size ?? 0,
          all.filter((p) => markOf(p) === 'bad').length,
          all.filter((p) => p.late).length,
          all.filter((p) => p.early).length,
          all.filter((p) => p.no_out).length,
          all.filter((p) => p.out_area).length,
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
        ['', 'ช = เวรเช้า · บ = เวรบ่าย · ด = เวรดึก · D = Day · N = Night (เวรที่สแกนเข้าจริง)'],
        ['', 'มีแค่ตัวย่อเวร = ปกติ · มีวงเล็บต่อท้าย = ผิดปกติ พร้อมรายละเอียด (มาสาย / ออกก่อน / ไม่สแกนออก / สแกนนอกพื้นที่)'],
        ['', '" / " = ควบเวรในวันเดียวกัน · "พัก" = ไม่มีการลงเวลา (ยังไม่ใช่การขาดงาน — ระบบยังไม่มีตารางเวร)'],
      ]
      const last = head.length
      await exportSheet({
        sheet: 'ตารางลงเวลา',
        aoa,
        cols: [10, 24, 18, 20, ...days.map(() => 14), 9, 13, 12, 13, 15, 14],
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
    // ช่องสีเต็มช่อง เว้นขอบ 3px ให้เห็นเส้นตาราง/พื้นวันหยุดรอบ ๆ
    padding: 3, height: 46, boxSizing: 'border-box',
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
                              <td key={d} style={dayCell(d)}><Cell ps={m?.get(d) ?? []} date={d} today={d === today} name={e.name} /></td>
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
                      <span style={{ position: 'relative', width: 16, height: 16 }}><ShiftPip kind={k} size={16} style={{ left: 0, top: 0 }} /></span>
                      {PIP[k].label}
                    </span>
                  ))}
                  <span title="ไม่มีการลงเวลาในวันนั้น — ยังไม่ใช่การขาดงาน เพราะระบบยังไม่มีตารางเวรล่วงหน้า"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'help' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: REST }} />พัก
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--surface-alt)', border: '1px solid var(--control-border)' }} />หยุด
                  </span>
                  <span aria-hidden style={{ width: 1, height: 14, background: 'var(--control-border)' }} />
                  {SERIES.map((x) => (
                    <span key={x.key} title={x.tip} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: x.tip ? 'help' : undefined }}>
                      <span style={{ width: 14, height: 14, boxSizing: 'border-box', borderRadius: 4, background: TINT[x.key], border: `${BORDER}px solid ${LINE[x.key]}` }} />{x.label}
                    </span>
                  ))}
                </div>
              </>
            )}
    </SectionPanel>
  )
}
