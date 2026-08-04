import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// ช่องค้นหา — Figma หน้าลงเวลา (node 227:6394)
// สเปกจริง: สูง 42 · r-full · พื้น surface (#F9FAFB) · ไม่มีขอบ · gap 10
//   ไอคอนแว่นขยาย 18px · placeholder 12/500 สีดำ 60%

export function SearchInput({ value, onChange, placeholder = 'ค้นหา', width = 321, autoFocus }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  width?: number | string
  autoFocus?: boolean
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
      minHeight: 42, width,
      padding: '0 var(--sp-4)',
      borderRadius: 'var(--r-full)',
      background: 'var(--surface)',
    }}>
      <Icon name="search" size={18} color="var(--text-dim)" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...TEXT.sm, fontWeight: 500,
          flex: 1, minWidth: 0,
          border: 'none', outline: 'none', background: 'transparent',
          color: 'var(--text)', fontFamily: 'var(--sans)',
        }}
      />
      {!!value && (
        <button onClick={() => onChange('')} title="ล้างคำค้น" style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--text-dim)', padding: 0, display: 'flex',
        }}>
          <Icon name="close" size={14} width={2} />
        </button>
      )}
    </div>
  )
}
