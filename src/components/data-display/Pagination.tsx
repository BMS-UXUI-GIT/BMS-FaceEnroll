import { TEXT } from '../../typography'
import { Icon } from '../../icons'

// แถบแบ่งหน้า — Figma component "Pagination" (node 90:2074)
// สเปกจริง: สูง 68 · padding 16/24 · ปุ่ม 36x36 radius 8
//   ซ้าย  = "แสดง N จาก M รายการ" 14/400 สี text-secondary
//   ขวา   = prev · เลขหน้า · ... · next
//   หน้าปัจจุบัน = พื้น accent-active + ตัวเลขขาว 14/500
//   prev/next    = พื้นขาว + ขอบ control-border

const cell: React.CSSProperties = {
  width: 36, height: 36, flex: 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--sans)', background: 'var(--bg)', color: 'var(--text-dim)',
}

/** เลขหน้าที่จะโชว์ — ต้นๆ ท้ายๆ เสมอ ตรงกลางย่อเป็น "..." (0-indexed เข้า/ออก) */
function pageList(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const out: (number | '…')[] = [0]
  const from = Math.max(1, page - 1), to = Math.min(total - 2, page + 1)
  if (from > 1) out.push('…')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < total - 2) out.push('…')
  out.push(total - 1)
  return out
}

export function Pagination({ page, pageSize, total, shown, onPage }: {
  page: number          // 0-indexed
  pageSize: number
  total: number
  shown?: number        // จำนวนแถวที่แสดงจริงบนหน้านี้ (ไม่ส่ง = คำนวณจาก pageSize)
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const count = shown ?? Math.min(pageSize, Math.max(0, total - page * pageSize))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)',
      minHeight: 68, padding: 'var(--sp-4) var(--sp-6)', flexWrap: 'wrap',
    }}>
      <span style={{ ...TEXT.body, color: 'var(--text-dim)' }}>
        แสดง {count} จาก {total} รายการ
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <button onClick={() => onPage(page - 1)} disabled={page <= 0} title="หน้าก่อนหน้า"
          style={{ ...cell, border: '1px solid var(--control-border)' }}>
          <Icon name="chevron-down" size={16} width={2} style={{ transform: 'rotate(90deg)' }} />
        </button>

        {pageList(page, pages).map((p, i) =>
          p === '…'
            ? <span key={`gap${i}`} style={{ ...cell, ...TEXT.body, cursor: 'default', background: 'transparent' }}>…</span>
            : (
              <button key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}
                style={{
                  ...cell, ...TEXT.body,
                  fontWeight: p === page ? 500 : 400,
                  background: p === page ? 'var(--accent-active)' : 'var(--bg)',
                  color: p === page ? 'var(--bg)' : 'var(--text-dim)',
                }}>{p + 1}</button>
            ),
        )}

        <button onClick={() => onPage(page + 1)} disabled={page >= pages - 1} title="หน้าถัดไป"
          style={{ ...cell, border: '1px solid var(--control-border)' }}>
          <Icon name="chevron-down" size={16} width={2} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>
    </div>
  )
}
