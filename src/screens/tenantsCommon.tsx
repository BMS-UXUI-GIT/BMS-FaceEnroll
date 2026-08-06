import { TEXT } from '../typography'

// ของใช้ร่วมของหน้าจัดการระบบ (อนุมัติ/จัดการโรงพยาบาล)

export const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
export const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 500 }
export const td: React.CSSProperties = { padding: '11px 12px' }
export const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-card)' }

export type Flag = { value: boolean; override: boolean }
export type Tenant = {
  hcode: string; name: string; active: boolean
  province?: string
  status: string; request_type: string
  demo_expires_at: string | null; demo_expired: boolean; prod_expires_at: string | null
  contact_name: string; contact_phone: string; contact_email: string; requested_at: string | null
  approved_by: string; approved_at: string | null; reject_reason: string
  note: string; health: 'ok' | 'watch' | 'risk'
  dry_run: Flag; auth_enforce: Flag; eligibility_check: Flag
  // โรงนี้มีคอลัมน์สถานะใน emp_in_out แล้วหรือยัง (เปิด = บันทึก/อ่านสถานะจาก DB จริง)
  has_status: Flag
}

export const HEALTH_TH: Record<string, { label: string; color: string }> = {
  ok: { label: 'ปกติ', color: 'var(--ok)' },
  watch: { label: 'ต้องติดตาม', color: 'var(--warn)' },
  risk: { label: 'เสี่ยง', color: 'var(--danger)' },
}

// แจ้ง Sidebar ให้อัปเดตตัวเลขงานค้าง (หลัง approve/reject)
export const notifyBadges = () => window.dispatchEvent(new Event('fh-badges'))

// ป้ายเปิด/ปิดแบบกดได้ — ทรงแคปซูลพื้นอ่อน ไม่มีขอบ ชุดเดียวกับป้ายสถานะหน้าอื่น
export function Pill({ label, tone, override, onClick, disabled }: { label: string; tone: 'ok' | 'off'; override?: boolean; onClick: () => void; disabled?: boolean }) {
  const c = tone === 'ok'
    ? { bg: 'var(--ok-light)', color: 'var(--ok)' }
    : { bg: 'var(--surface-gray)', color: 'var(--text-dim)' }
  return (
    <button onClick={onClick} disabled={disabled} title={override ? 'ตั้งเฉพาะโรงพยาบาลนี้ (ต่างจากค่ากลาง)' : 'ใช้ค่ากลาง'}
      style={{
        ...TEXT.sm, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: 'var(--sp-1) var(--sp-3)', minHeight: 32, borderRadius: 'var(--r-full)',
        cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
        background: c.bg, color: c.color, border: 'none', opacity: disabled ? 0.6 : 1,
      }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 'var(--r-full)', background: 'currentColor', flex: 'none' }} />
      {label}{override ? ' •' : ''}
    </button>
  )
}
