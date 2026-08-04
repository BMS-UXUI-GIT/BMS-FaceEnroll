import { useEffect, useRef, useState } from 'react'
import { api } from './api'

// hook โหลดข้อมูลกลาง ใช้ทุกหน้า
// - เปลี่ยน path (สลับโรง/แท็บ) = ล้างข้อมูลเก่าก่อน กันข้อมูลข้ามโรงค้างจอ
// - กดรีเฟรช (reloadKey) = คงข้อมูลเดิมไว้ระหว่างโหลด, loading บอกสถานะจริง
export function useFetch<T>(path: string | null, reloadKey = 0): { data: T | null; err: string | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const lastPath = useRef<string | null>(null)
  useEffect(() => {
    if (!path) { lastPath.current = null; setData(null); setErr(null); setLoading(false); return }
    let alive = true
    if (path !== lastPath.current) setData(null)
    lastPath.current = path
    setLoading(true); setErr(null)
    api.get<T>(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [path, reloadKey])
  return { data, err, loading }
}

// ดึงข้อมูลแบบแบ่งหน้าจากเซิร์ฟเวอร์ — ต่อ limit/offset ให้ url เอง (front คุมขนาดหน้า)
// base = url ก่อนใส่หน้า (ใส่ query อื่นมาได้) ; เปลี่ยน base (กรอง/สลับโรง) = เด้งกลับหน้าแรก
// pageParam ให้เปลี่ยนชื่อ offset ได้ (analytics ใช้ late_offset/early_offset แยกกัน)
export function useServerPage<T>(base: string | null, reload = 0, pageSize = 20, offsetParam = 'offset') {
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [base])
  const url = base == null ? null
    : `${base}${base.includes('?') ? '&' : '?'}limit=${pageSize}&${offsetParam}=${page * pageSize}`
  const f = useFetch<T>(url, reload)
  return { ...f, page, setPage, pageSize }
}

// จอเล็กไหม (responsive) — อัปเดตตอนหมุนจอ/ย่อหน้าต่าง
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const fn = () => setMatch(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [query])
  return match
}

// หน้า login/ลงทะเบียน: จอใหญ่กว่า Full HD ให้ขยายทั้งหน้าตามสัดส่วน (เห็นเท่ากับบน Full HD)
// ไม่ยืดเลย์เอาต์ — ดีไซน์คงสัดส่วนเดิม · จอ ≤ Full HD คืนค่า 1 (ไม่แตะอะไร)
export function useScreenZoom(baseW = 1920, baseH = 1080, max = 2.5): number {
  const calc = () => Math.min(Math.max(1, Math.min(window.innerWidth / baseW, window.innerHeight / baseH)), max)
  const [zoom, setZoom] = useState(calc)
  useEffect(() => {
    const fn = () => setZoom(calc())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [baseW, baseH, max])
  return zoom
}

// ตัวเลขมี comma คั่นหลักพัน (เช่น 1,521) — ต่ำกว่าพันแสดงปกติ; null/ไม่ใช่ตัวเลข = "—"
const _grp = new Intl.NumberFormat('en-US')
export function nf(n: number | null | undefined): string {
  if (n == null || typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return _grp.format(n)
}

// ISO UTC จาก backend -> เวลาไทยอ่านง่าย (สั้น: วันที่ / ยาว: วันที่+เวลา)
export function thDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString('th-TH', { dateStyle: 'short' })
}
export function thDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? String(iso).slice(0, 16).replace('T', ' ') : d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}
