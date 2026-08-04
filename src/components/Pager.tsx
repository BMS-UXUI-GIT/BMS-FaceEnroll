import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../icons'
import { nf } from '../hooks'

// แบ่งหน้า + ช่องค้นหา ใช้ร่วมทุกตาราง
// ขนาดหน้า (front กำหนดเอง — ส่งเป็น limit ให้ backend, backend ไม่ hardcode)
export const PAGE_SIZE = 20

// ปุ่มควบคุมหน้าเต็มชุด: « แรกสุด · ‹ ก่อนหน้า · [หน้า/ทั้งหมด] · ถัดไป › · สุดท้าย »
export function Pager({ page, total, pageSize = PAGE_SIZE, onPage }: {
  page: number
  total: number
  pageSize?: number
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(Math.max(0, page), pages - 1)
  const from = total === 0 ? 0 : cur * pageSize + 1
  const to = Math.min(total, (cur + 1) * pageSize)

  // ข้อมูลไม่ถึง 1 หน้า — โชว์แค่จำนวนรวม
  if (total <= pageSize) {
    return <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{nf(total)} รายการ</span>
  }

  const nav = (label: string, target: number, dis: boolean, title: string) => (
    <button onClick={() => onPage(target)} disabled={dis} title={title}
      style={{
        fontSize: 12.5, fontWeight: 600, minWidth: 30, padding: '5px 9px', borderRadius: 8,
        border: '1px solid var(--border)', background: 'var(--surface)',
        color: dis ? 'var(--text-faint)' : 'var(--text)', cursor: dis ? 'default' : 'pointer',
        opacity: dis ? 0.5 : 1, fontFamily: 'var(--sans)',
      }}>{label}</button>
  )

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: 'var(--text-faint)', marginRight: 4 }}>
        {nf(from)}–{nf(to)} จาก {nf(total)}
      </span>
      {nav('«', 0, cur <= 0, 'หน้าแรก')}
      {nav('‹', cur - 1, cur <= 0, 'ก่อนหน้า')}
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--mono)', padding: '0 4px', minWidth: 54, textAlign: 'center' }}>
        {nf(cur + 1)}/{nf(pages)}
      </span>
      {nav('›', cur + 1, cur >= pages - 1, 'ถัดไป')}
      {nav('»', pages - 1, cur >= pages - 1, 'หน้าสุดท้าย')}
    </span>
  )
}

/// แบ่งหน้าฝั่งเว็บ (ข้อมูลโหลดมาแล้วทั้งก้อน — ใช้กับลิสต์เล็กที่มีค้นหาในหน้า) — clamp กันหน้าเกินช่วง
export function usePaged<T>(rows: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const eff = Math.min(page, pages - 1)
  useEffect(() => { if (page !== eff) setPage(eff) }, [eff, page])
  const pageRows = useMemo(() => rows.slice(eff * pageSize, (eff + 1) * pageSize), [rows, eff, pageSize])
  // offset ของแถวแรกในหน้า — เอาไปทำเลขลำดับ (offset + i + 1)
  return { pageRows, page: eff, pages, setPage, total: rows.length, offset: eff * pageSize }
}

export function SearchInput({ value, onChange, placeholder, width = 200 }: {
  value: string; onChange: (v: string) => void; placeholder: string; width?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)' }}>
      <Icon name="search" size={14} color="var(--text-faint)" width={1.8} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, fontFamily: 'var(--sans)', color: 'var(--text)', width }} />
    </div>
  )
}
