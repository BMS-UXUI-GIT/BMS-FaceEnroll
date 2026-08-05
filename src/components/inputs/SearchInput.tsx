import { useRef } from 'react'
import { Icon } from '../../icons'
import { TEXT } from '../../typography'

// ช่องค้นหา — Figma หน้าลงเวลา (node 227:6394)
// สเปกจริง: สูง 42 · r-full · พื้น surface (#F9F9F9 ชุดเดียวกับชิป) · ไม่มีขอบ · gap 10
//   ไอคอนแว่นขยาย 18px · placeholder 12/500 สีดำ 60%
//
// สถานะ: default / hover / focus (ขอบ+วงเรือง) / filled (มีปุ่มล้างคำค้น) / disabled
//   สองอันแรกมาจากคลาส .searchbox ใน theme.css — ชุดเดียวกับ .chip ให้แถวตัวกรองดูเป็นพวกเดียวกัน
// กดที่ว่างตรงไหนของช่องก็โฟกัสเข้า input

export function SearchInput({ value, onChange, placeholder = 'ค้นหา', width = 321, grow, disabled, autoFocus }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  width?: number | string
  /** Figma ให้ช่องค้นหาเป็น flex:1 0 0 ในแถบตัวกรอง — ยืดเต็มที่ว่างที่เหลือจากชิป */
  grow?: boolean
  disabled?: boolean
  autoFocus?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="searchbox"
      onClick={() => inputRef.current?.focus()}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        minHeight: 48,
        padding: '0 var(--sp-4)',
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.5 : 1,
        ...(grow ? { flex: '1 1 0', minWidth: 0 } : { display: 'inline-flex', width }),
      }}
    >
      <Icon name="search" size={18} color="var(--text-dim)" />
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        // Esc = ล้างคำค้น (ไม่ต้องลากเมาส์ไปกดกากบาท)
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange('') } }}
        placeholder={placeholder}
        style={{
          ...TEXT.sm, fontWeight: 500,
          flex: 1, minWidth: 0,
          border: 'none', outline: 'none', background: 'transparent',
          color: 'var(--text)', fontFamily: 'var(--sans)',
        }}
      />
      {!!value && !disabled && (
        <button onClick={(e) => { e.stopPropagation(); onChange(''); inputRef.current?.focus() }}
          type="button" title="ล้างคำค้น" aria-label="ล้างคำค้น" style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-dim)', padding: 0, display: 'flex',
          }}>
          <Icon name="close" size={14} width={2} />
        </button>
      )}
    </div>
  )
}
