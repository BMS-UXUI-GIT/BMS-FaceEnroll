import { nf } from '../../hooks'
import { StatusBadge } from '../../components/data-display/StatusBadge'
import type { IssueLike } from './types'

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${m} ม.`)

// ป้ายสถานะของแถว — ประกอบจาก StatusBadge ของ design system
// ⚠️ Figma มี 5 สถานะ (ตรงเวลา/มาสาย/ลา/นอกพื้นที่/ออกก่อนเวลา) แต่ระบบมี "ยังไม่ออกเวร"
//    เพิ่มมาซึ่งไม่มีใน Figma — ยืมชุดสีของ 'leave' มาใช้ไปก่อน ควรเพิ่ม variant ใน Figma
export function IssueBadges({ r }: { r: IssueLike }) {
  const on = [
    r.late && <StatusBadge key="late" status="late" label={r.late_min ? `สาย ${nf(r.late_min)} นาที` : 'สาย'} />,
    r.early && <StatusBadge key="early" status="early" label={r.early_min ? `ออกก่อน ${nf(r.early_min)} นาที` : 'ออกก่อน'} />,
    r.no_out && <StatusBadge key="noout" status="leave" label="ยังไม่ออกเวร" />,
    r.out_area === true && <StatusBadge key="out" status="outarea" label={r.dist_m != null ? `นอกพื้นที่ ${fmtDist(r.dist_m)}` : 'นอกพื้นที่'} />,
  ].filter(Boolean)

  if (on.length === 0) return <StatusBadge status="ontime" label="ปกติ" />
  return <span style={{ display: 'inline-flex', gap: 'var(--sp-1)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>{on}</span>
}
