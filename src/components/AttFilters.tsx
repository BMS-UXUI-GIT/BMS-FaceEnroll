import { useEffect, useState } from 'react'
import { api } from '../api'
import { SearchSelect, type SelectOpt } from './SearchSelect'

// ตัวกรอง เวร/แผนก ใช้ร่วมหน้า Dashboard + ลงเวลา — ตัวเลือกดึงจากโรงที่เลือก
// แผนกมี "ไม่ระบุแผนก" เสมอ (โรงส่วนใหญ่กรอกแผนกใน HOSxP ไม่ครบ)

export function useAttFilterOptions(hcode: string) {
  const [shiftOpts, setShiftOpts] = useState<SelectOpt[]>([])
  const [deptOpts, setDeptOpts] = useState<SelectOpt[]>([])
  useEffect(() => {
    if (!hcode) { setShiftOpts([]); setDeptOpts([]); return }
    let alive = true
    api.get<{ shifts: { id: string; name: string }[]; departments: { id: string; name: string }[] }>(
      `/admin/attendance/filters?hcode=${encodeURIComponent(hcode)}`)
      .then((d) => {
        if (!alive) return
        setShiftOpts((d.shifts ?? []).map((s) => ({ value: s.id, label: s.name })))
        setDeptOpts([
          ...(d.departments ?? []).map((x) => ({ value: x.id, label: x.name })),
          { value: 'none', label: 'ไม่ระบุแผนก' },
        ])
      })
      .catch(() => { if (alive) { setShiftOpts([]); setDeptOpts([{ value: 'none', label: 'ไม่ระบุแผนก' }]) } })
    return () => { alive = false }
  }, [hcode])
  return { shiftOpts, deptOpts }
}

// เลือก/เอาออกจากรายการที่เลือกไว้ (ตัวกรองแบบเลือกได้หลายอัน)
export const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

// ข้อความสรุปตัวกรองหลายค่า (ใช้ในหัวตาราง/ชื่อไฟล์รายงาน)
//   ไม่เลือก → allLabel · 1–2 อัน → ชื่อเต็ม · มากกว่านั้น → นับจำนวน
export const selLabel = (opts: SelectOpt[], sel: string[], allLabel: string, unit: string) => {
  if (sel.length === 0) return allLabel
  if (sel.length <= 2) return sel.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(', ')
  return `${sel.length} ${unit}`
}

export function ShiftDeptFilters({ shiftOpts, deptOpts, shifts, depts, onShifts, onDepts }: {
  shiftOpts: SelectOpt[]
  deptOpts: SelectOpt[]
  shifts: string[]
  depts: string[]
  onShifts: (v: string[]) => void
  onDepts: (v: string[]) => void
}) {
  return (
    <>
      <SearchSelect multi values={shifts} onToggle={(v) => onShifts(toggle(shifts, v))} onClear={() => onShifts([])}
        options={shiftOpts} placeholder="เวร: ทั้งหมด" searchPlaceholder="ค้นเวร…" width={150} />
      <SearchSelect multi values={depts} onToggle={(v) => onDepts(toggle(depts, v))} onClear={() => onDepts([])}
        options={deptOpts} placeholder="แผนก: ทั้งหมด" searchPlaceholder="ค้นแผนก…" width={150} />
    </>
  )
}

// วันที่แบบ local (Asia/Bangkok ของเครื่องผู้ใช้) — toISOString เป็น UTC จะเพี้ยนตอนเช้ามืด
export const localISO = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const daysAgoISO = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localISO(d)
}

// เลื่อนวันจาก ISO (delta ลบ = ย้อนหลัง) — ใช้ทำขอบล่างช่วงวันที่ให้ตรง cap ของ backend
export const isoAddDays = (iso: string, delta: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return localISO(d)
}

// query ส่วนฟิลเตอร์ (ว่าง = ไม่กรอง)
export const filterQS = (shifts: string[], depts: string[]) =>
  `${shifts.length ? `&shifts=${shifts.join(',')}` : ''}${depts.length ? `&depts=${depts.map(encodeURIComponent).join(',')}` : ''}`
