import { useState } from 'react'
import { nf, useFetch } from '../hooks'
import { Loading } from '../components/Spinner'
import { Pager, PAGE_SIZE, usePaged } from '../components/Pager'
import { RefreshButton } from '../components/RefreshButton'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '11px 12px' }
const theadTr: React.CSSProperties = { textAlign: 'left', color: 'var(--text-faint)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--surface-card)' }

type HospCheck = { hcode: string; name: string; ok: boolean; latency_ms: number; error: string }
type Health = {
  face: { status?: string; version?: string; engine?: Record<string, any>; db?: Record<string, any>; error?: string }
  attendance: { dry_run_global: boolean; facescan_configured: boolean }
  dashboard_db: string
  hospitals: HospCheck[]
}

function Dot({ ok }: { ok: boolean }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--ok)' : 'var(--danger)', display: 'inline-block' }} />
}

function Card({ title, ok, status, rows }: { title: string; ok: boolean; status: string; rows: [string, any][] }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: ok ? 'var(--ok)' : 'var(--danger)' }}><Dot ok={ok} />{status}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: 'var(--text-dim)' }}>{k}</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Health() {
  const [reload, setReload] = useState(0)
  const { data: d, err, loading } = useFetch<Health>('/admin/health', reload)

  const f = d?.face || {}
  const eng = f.engine || {}
  const fdb = f.db || {}
  const engOk = eng.ok === true
  const dbOk = fdb.ok === true
  const faceStatus = f.status // 'ok' | 'degraded' | undefined
  const hospitals = d?.hospitals ?? []
  const downCount = hospitals.filter((h) => !h.ok).length
  const paged = usePaged(hospitals)

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><RefreshButton busy={loading} onClick={() => setReload((r) => r + 1)} /></div>
      {err ? (
        <div style={{ ...card, padding: 20, color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>
      ) : !d ? (
        <div style={card}><Loading text="กำลังตรวจทุกระบบ… (เช็คทุกโรงพร้อมกัน)" /></div>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(270px, 100%), 1fr))', gap: 16 }}>
        <Card title="ตัวประมวลผลใบหน้า (Luxand)" ok={engOk} status={engOk ? 'ปกติ' : 'ต่อไม่ได้'}
          rows={[['ที่อยู่', eng.url || '—'], ...(eng.error ? [['ข้อผิดพลาด', eng.error]] as [string, any][] : [])]} />
        <Card title="บริการสแกนหน้า" ok={faceStatus === 'ok'}
          status={faceStatus === 'ok' ? 'ปกติ' : faceStatus === 'degraded' ? 'ทำงานได้บางส่วน' : f.error || '—'}
          rows={[['เวอร์ชัน', f.version || '—'], ['ฐานข้อมูลใบหน้า', dbOk ? 'ปกติ' : 'มีปัญหา']]} />
        <Card title="ระบบลงเวลา" ok={d.attendance.facescan_configured && d.dashboard_db === 'ok'}
          status={d.dashboard_db === 'ok' ? 'ปกติ' : 'ฐานข้อมูลมีปัญหา'}
          rows={[
            ['ฐานข้อมูลระบบลงเวลา', d.dashboard_db === 'ok' ? 'ปกติ' : 'ล่ม'],
            ['เชื่อมระบบสแกนหน้า', d.attendance.facescan_configured ? 'เชื่อมแล้ว' : 'ยังไม่ตั้งค่า'],
            ['โหมดทดสอบ (ไม่บันทึกจริง)', d.attendance.dry_run_global ? 'เปิด' : 'ปิด'],
          ]} />
      </div>

      {/* การเชื่อมต่อรายโรงพยาบาล */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>การเชื่อมต่อรายโรงพยาบาล</h2>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>ระบบของแต่ละโรงอยู่คนละเซิร์ฟเวอร์ — ทดสอบดึงข้อมูลจริงทีละโรง</span>
          {downCount > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-light)', borderRadius: 20, padding: '2px 10px' }}>ต่อไม่ได้ {downCount} โรง</span>}
          <div style={{ marginLeft: 'auto' }}><Pager page={paged.page} total={paged.total} onPage={paged.setPage} /></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
          <thead><tr style={theadTr}><th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th><th style={{ ...th, padding: '10px 20px' }}>รหัสโรง</th><th style={th}>ชื่อโรง</th><th style={th}>สถานะ</th><th style={th}>ความเร็วตอบ</th><th style={{ ...th, padding: '10px 20px' }}>ปัญหา</th></tr></thead>
          <tbody>
            {paged.pageRows.map((h, i) => (
              <tr key={h.hcode} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(paged.offset + i + 1)}</td>
                <td style={{ ...td, padding: '11px 20px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{h.hcode}</td>
                <td style={{ ...td, fontWeight: 600 }}>{h.name || '—'}</td>
                <td style={td}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: h.ok ? 'var(--ok)' : 'var(--danger)' }}>
                    <Dot ok={h.ok} />{h.ok ? 'เชื่อมต่อได้' : 'ต่อไม่ได้'}
                  </span>
                </td>
                <td style={{ ...td, fontFamily: 'var(--mono)', color: h.latency_ms > 3000 ? 'var(--warn)' : 'var(--text-dim)' }}>{nf(h.latency_ms)} ms</td>
                <td style={{ ...td, padding: '11px 20px', fontSize: 12, color: 'var(--danger)' }}>{h.error || '—'}</td>
              </tr>
            ))}
            {hospitals.length === 0 && <tr><td colSpan={6} style={{ ...td, padding: '18px 20px', color: 'var(--text-faint)', textAlign: 'center' }}>ยังไม่มีโรงเปิดใช้งาน</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
