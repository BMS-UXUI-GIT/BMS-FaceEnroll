import type { Fence, ScanPoint } from '../../components/ScanMap'

// ชนิดข้อมูลของหน้าลงเวลา — ใช้ร่วมกันระหว่างหน้าหลักและ modal ย่อย

export type DailyRow = {
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

export type Daily = {
  summary: { date: string; punched: number; done: number; open: number; late: number; early: number; out_area: number }
  rows: DailyRow[]
  total: number
  fences: Fence[]
}

export type LateRow = { emp: string; name: string; dept?: string; date: string; shift: string; io: string; issue: string; seq?: number }
export type Timesheet = { from: string; to: string; rows: LateRow[]; total: number }

export type MonthlyRow = { emp: string; name: string; dept?: string; present: number; late: number; early: number; no_out: number; out_area: number }
export type Monthly = { month: string; days_counted: number; rows: MonthlyRow[]; total: number }

export type HistRow = {
  date: string; seq?: number; in: string; out: string; shift: string
  late: boolean; early: boolean; late_min?: number; early_min?: number
  no_out: boolean; out_area: boolean | null; dist_m: number | null
}
export type EmpHist = {
  emp_id: string; name: string; days: number
  stat: { present: number; late: number; early: number; no_out: number; out_area: number }
  rows: HistRow[]
}

/** สิ่งที่ทุกแถวต้องมีเพื่อให้ IssueBadges อ่านสถานะได้ */
export type IssueLike = {
  late: boolean; early: boolean; no_out: boolean; out_area: boolean | null
  dist_m?: number | null; late_min?: number; early_min?: number
}
