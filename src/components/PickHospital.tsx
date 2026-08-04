import { Icon } from '../icons'

// ขึ้นเมื่อยังไม่ได้เลือกโรง (currentHcode = '*') บนหน้าที่แสดงข้อมูลรายโรง
export function PickHospital() {
  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)',
        padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-dim)', fontSize: 13.5,
      }}>
        <Icon name="hospital" size={18} color="var(--text-faint)" width={1.8} />
        กรุณาเลือกโรงพยาบาลก่อน
      </div>
    </div>
  )
}
