import { nf } from '../../hooks'
import { ScanMap, type Fence } from '../../components/ScanMap'
import { Modal } from '../../components/feedback/Modal'
import { Button } from '../../components/inputs/Button'
import { TEXT } from '../../typography'
import { IssueBadges } from './IssueBadges'
import type { DailyRow } from './types'

// รายละเอียดการลงเวลา 1 รายการ + แผนที่จุดสแกน
// onFix = ทางเข้าแก้เวลาย้อนหลัง (ตารางใน Figma ไม่มีปุ่มนี้ จึงย้ายมาไว้ในนี้)
export function PunchModal({ row, fences, date, onClose, onFix }: {
  row: DailyRow; fences: Fence[]; date: string; onClose: () => void; onFix?: () => void
}) {
  const mono: React.CSSProperties = { fontFamily: 'var(--mono)' }

  return (
    <Modal open title={`${row.name} · ${date}`} onClose={onClose}
      footer={row.coords.length > 0
        ? 'หมุด = จุดที่สแกนจริง (เขียว = ในพื้นที่ · แดง = นอกพื้นที่) · วงกลม = จุดลงเวลาที่โรงกำหนด'
        : undefined}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        {[['เข้าเวร', row.in], ['ออกเวร', row.out], ['เวร', row.shift], ['สถานะ', '']].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)' }}>
            <div style={{ ...TEXT.caption, color: 'var(--text-dim)' }}>{l}</div>
            {v !== ''
              ? <div style={{ ...TEXT.bodyBold, ...mono, marginTop: 'var(--sp-0)' }}>{v}</div>
              : <div style={{ marginTop: 'var(--sp-1)' }}><IssueBadges r={row} /></div>}
          </div>
        ))}
      </div>

      {/* สถานะที่โรงบันทึกไว้ตอนสแกน (โรงที่เปิดเก็บสถานะ) — แช่ความจริง ณ วันนั้น */}
      {(row.status_in || row.status_out) && (
        <div style={{ ...TEXT.sm, display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)', color: 'var(--text-dim)' }}>
          <span>สถานะที่บันทึกไว้:</span>
          {row.status_in && <span><b style={{ color: 'var(--text)' }}>เข้า</b> {row.status_in}{row.late_min ? ` (${nf(row.late_min)} นาที)` : ''}</span>}
          {row.status_out && <span><b style={{ color: 'var(--text)' }}>ออก</b> {row.status_out}{row.early_min ? ` (${nf(row.early_min)} นาที)` : ''}</span>}
        </div>
      )}

      {onFix && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
          <Button size="sm" variant="secondary" onClick={onFix}>แก้เวลาย้อนหลัง</Button>
        </div>
      )}

      {row.coords.length > 0
        ? <ScanMap fences={fences} points={row.coords} height={330} />
        : <div style={{ ...TEXT.body, padding: 'var(--sp-5) 0', color: 'var(--text-dim)', textAlign: 'center' }}>รายการนี้ไม่มีพิกัด GPS</div>}
    </Modal>
  )
}
