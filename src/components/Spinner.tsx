// วงหมุนโหลด ใช้ร่วมทุกหน้า (คลาส .spin อยู่ใน theme.css)

export function Spinner({ size = 15, stroke = 2 }: { size?: number; stroke?: number }) {
  return (
    <span className="spin" aria-label="กำลังโหลด" style={{
      width: size, height: size, borderRadius: '50%', flex: 'none',
      border: `${stroke}px solid var(--border)`, borderTopColor: 'var(--accent)',
    }} />
  )
}

export function Loading({ text = 'กำลังโหลด…', pad = 26 }: { text?: string; pad?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: pad, color: 'var(--text-faint)', fontSize: 12.5 }}>
      <Spinner />{text}
    </div>
  )
}
