// ปุ่มรีเฟรช — หมุนตามสถานะโหลดจริง (busy) ไม่ใช่ timer
export function RefreshButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={() => !busy && onClick()}
      disabled={busy}
      title="โหลดข้อมูลล่าสุด"
      style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
        padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text-dim)', fontFamily: 'var(--sans)',
        cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
      }}
    >
      <span className={busy ? 'spin' : ''} style={{ fontSize: 14, lineHeight: 1 }}>↻</span>
      {busy ? 'กำลังโหลด…' : 'รีเฟรช'}
    </button>
  )
}
