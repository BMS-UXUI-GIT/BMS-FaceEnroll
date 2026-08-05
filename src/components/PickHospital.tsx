import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'
import { SearchSelect } from './SearchSelect'

// ขึ้นเมื่อยังไม่ได้เลือกโรง (currentHcode = '*') บนหน้าที่แสดงข้อมูลรายโรง
// มี list โรงให้กดเลือกได้ในหน้านี้เลย (ไม่ต้องไปเปิดเมนูโปรไฟล์)
export function PickHospital() {
  const { session, setHcode } = useApp()
  const hospitals = session?.hospitals ?? []

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)',
        padding: '22px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-dim)', ...TEXT.body }}>
          <Icon name="hospital" size={18} color="var(--text-faint)" width={1.8} />
          กรุณาเลือกโรงพยาบาลก่อน
        </div>

        {hospitals.length === 0 ? (
          <div style={{ ...TEXT.sm, color: 'var(--text-faint)', marginTop: 12 }}>
            บัญชีนี้ยังไม่มีโรงพยาบาลในสิทธิ์
          </div>
        ) : hospitals.length > 8 ? (
          // โรงเยอะ (ส่วนกลาง) → ช่องค้นหา
          <div style={{ marginTop: 16, maxWidth: 380 }}>
            <SearchSelect
              options={hospitals.map((h) => ({ value: h.value, label: h.label, sub: h.value }))}
              onChange={setHcode}
              placeholder="เลือกโรงพยาบาล…"
            />
          </div>
        ) : (
          // โรงไม่เยอะ → ปุ่มกดเลือกตรงๆ
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {hospitals.map((h) => (
              <button key={h.value} type="button" onClick={() => setHcode(h.value)}
                className="row-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10,
                  background: 'var(--surface-card)', color: 'var(--text)', cursor: 'pointer',
                }}>
                <span style={{
                  fontFamily: 'var(--mono)', ...TEXT.caption, fontWeight: 500,
                  color: 'var(--accent-active)', background: 'var(--accent-light)',
                  padding: '2px 8px', borderRadius: 6, flex: 'none',
                }}>{h.value}</span>
                <span style={{ ...TEXT.bodyMed, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</span>
                <Icon name="chevron-down" size={16} width={2} color="var(--text-faint)" style={{ transform: 'rotate(-90deg)', flex: 'none' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
