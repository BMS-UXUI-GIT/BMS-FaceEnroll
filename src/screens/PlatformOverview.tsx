import { useState } from 'react'
import { nf, useFetch } from '../hooks'
import { Info } from '../components/Info'
import { Loading } from '../components/Spinner'
import { RefreshButton } from '../components/RefreshButton'
import { useApp } from '../state'

// Dashboard ระดับระบบ (super/ส่วนกลาง) — เห็นเมื่อเลือก "ทุกโรงพยาบาล"

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }

type Row = {
  hcode: string; name: string; bucket: string; request_type: string
  demo_expires_at: string | null; demo_days_left: number | null
  contact_name: string; contact_phone: string; requested_at: string | null
}
type Data = {
  total: number
  counts: Record<string, number>
  recent: Row[]
  follow_up: Row[]
  hospitals: Row[]
}

const BUCKET: Record<string, { label: string; color: string }> = {
  pending: { label: 'รออนุมัติ', color: 'var(--warn)' },
  demo: { label: 'ทดลองใช้', color: 'var(--info)' },
  demo_expiring: { label: 'ใกล้หมดอายุ', color: 'var(--warn)' },
  demo_expired: { label: 'หมดอายุทดลอง', color: 'var(--danger)' },
  real: { label: 'ใช้งานจริง', color: 'var(--ok)' },
  suspended: { label: 'พักใช้', color: 'var(--text-faint)' },
  rejected: { label: 'ปฏิเสธ', color: 'var(--text-faint)' },
}

function Badge({ bucket }: { bucket: string }) {
  const b = BUCKET[bucket] ?? { label: bucket, color: 'var(--text-dim)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: b.color, background: 'color-mix(in srgb, ' + b.color + ' 12%, transparent)', border: `1px solid ${b.color}` }}>
      {b.label}
    </span>
  )
}

export function PlatformOverview() {
  const { setNav } = useApp()
  const [reload, setReload] = useState(0)
  const { data: d, err, loading } = useFetch<Data>('/admin/platform/overview', reload)

  if (err) return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><RefreshButton busy={loading} onClick={() => setReload((r) => r + 1)} /></div>
      <div style={{ ...card, padding: 20, color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>
    </div>
  )
  if (!d) return <div style={{ maxWidth: 'var(--page-max)' }}><div style={card}><Loading /></div></div>

  const c = d?.counts ?? {}
  const KPIS = [
    { v: d?.total, label: 'โรงพยาบาลทั้งหมด', color: 'var(--accent)', icon: '🏥', tip: 'จำนวนโรงพยาบาลทั้งหมดในระบบ นับทุกสถานะรวมกัน' },
    { v: c.pending, label: 'รออนุมัติ', color: 'var(--warn)', icon: '⏳', tip: 'โรงที่ยื่นคำขอผ่านฟอร์มลงทะเบียน กำลังรอผู้ดูแลกดอนุมัติ — กดการ์ดนี้เพื่อไปหน้าอนุมัติ', nav: 'sys-approve' },
    { v: c.demo, label: 'ทดลองใช้', color: 'var(--info)', icon: '🧪', tip: 'โรงที่อนุมัติแบบทดลองใช้ (ฟรี 60 วัน) และยังเหลือเวลาเกิน 7 วัน' },
    { v: c.demo_expiring, label: 'ใกล้หมดอายุ', color: 'var(--warn)', icon: '⚠️', tip: 'โรงทดลองใช้ที่เหลือเวลาไม่เกิน 7 วันก่อนหมดอายุ — ควรติดต่อเพื่อต่ออายุหรือเปิดใช้งานจริง' },
    { v: c.demo_expired, label: 'หมดอายุทดลอง', color: 'var(--danger)', icon: '⛔', tip: 'โรงทดลองใช้ที่เลยวันหมดอายุแล้ว — พนักงานลงเวลาไม่ได้จนกว่าจะต่ออายุ' },
    { v: c.real, label: 'ใช้งานจริง', color: 'var(--ok)', icon: '✅', tip: 'โรงที่อนุมัติแบบใช้งานจริง (เปิดถาวร ไม่มีวันหมดอายุ)' },
    { v: c.suspended, label: 'พักใช้', color: 'var(--text-faint)', icon: '⏸️', tip: 'โรงที่ถูกสั่งพักการใช้งานชั่วคราว (ข้อมูลไม่ถูกลบ เปิดกลับมาได้)' },
    { v: c.rejected, label: 'ปฏิเสธ', color: 'var(--text-faint)', icon: '🚫', tip: 'คำขอลงทะเบียนที่ผู้ดูแลกดปฏิเสธ (พร้อมเหตุผล) — โรงยื่นคำขอใหม่ได้' },
  ]
  const barBuckets = ['pending', 'demo', 'demo_expiring', 'demo_expired', 'real', 'suspended']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 'var(--page-max)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <RefreshButton busy={loading} onClick={() => setReload((r) => r + 1)} />
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: 14 }}>
        {KPIS.map((k: any) => (
          <div key={k.label} className="lift" onClick={k.nav ? () => setNav(k.nav) : undefined}
            title={k.nav ? 'กดเพื่อไปหน้าอนุมัติโรงพยาบาล' : undefined}
            style={{ ...card, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 13, cursor: k.nav ? 'pointer' : 'default' }}>
            <div style={{
              width: 42, height: 42, flex: 'none', borderRadius: 12, fontSize: 19,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `color-mix(in srgb, ${k.color} 13%, transparent)`,
              border: `1px solid color-mix(in srgb, ${k.color} 30%, transparent)`,
            }}>{k.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '-.5px', color: (k.v ?? 0) > 0 ? 'var(--text)' : 'var(--text-faint)' }}>{nf(k.v)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}<Info text={k.tip} /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* สัดส่วนสถานะ */}
          <div style={{ ...card, padding: '18px 20px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>สัดส่วนสถานะโรงพยาบาล<Info text="แถบแสดงสัดส่วนของแต่ละสถานะเทียบกับโรงทั้งหมด (%)" /></h2>
            {barBuckets.map((k) => {
              const n = c[k] ?? 0
              const pct = d?.total ? Math.round(n * 100 / d.total) : 0
              const b = BUCKET[k]
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', width: 105, flex: 'none' }}>{b.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--surface-card)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: b.color, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-dim)', width: 56, textAlign: 'right' }}>{nf(n)} โรง</span>
                </div>
              )
            })}
            {d && d.total === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>ยังไม่มีโรงในระบบ — รอคำขอจากฟอร์มลงทะเบียน</div>}
          </div>

          {/* โรงสมัครล่าสุด */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14.5 }}>คำขอลงทะเบียนล่าสุด</div>
            {(d?.recent ?? []).map((r) => (
              <div key={r.hcode} className="row-hover" style={{ padding: '11px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => setNav(r.bucket === 'pending' ? 'sys-approve' : 'sys-hospitals')}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)', width: 48 }}>{r.hcode}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{r.requested_at?.slice(0, 10) ?? ''}</span>
                <Badge bucket={r.bucket} />
              </div>
            ))}
            {d && d.recent.length === 0 && <div style={{ padding: '16px 20px', color: 'var(--text-faint)', fontSize: 12.5, textAlign: 'center' }}>ยังไม่มีคำขอ</div>}
          </div>
        </div>

        {/* ต้องติดตาม */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', background: 'var(--danger-light)' }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--danger)' }}>ต้องติดตาม<Info text="รวมโรงทดลองใช้ที่ใกล้หมดอายุ (≤7 วัน) และที่หมดอายุแล้ว เรียงจากด่วนสุด" /></div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>ทดลองใช้ใกล้หมดอายุ / หมดอายุแล้ว — ติดต่อโรงเพื่อต่ออายุหรือเปิดใช้งานจริง</div>
          </div>
          {(d?.follow_up ?? []).map((r) => (
            <div key={r.hcode} className="row-hover" style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setNav('sys-hospitals')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{r.name}</span>
                <Badge bucket={r.bucket} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
                {r.demo_days_left != null && r.demo_days_left >= 0 ? `เหลือ ${r.demo_days_left} วัน (ถึง ${r.demo_expires_at})` : `หมดอายุแล้ว ${r.demo_expires_at ?? ''}`}
                {r.contact_phone ? ` · ${r.contact_name} ${r.contact_phone}` : ''}
              </div>
            </div>
          ))}
          {d && d.follow_up.length === 0 && <div style={{ padding: '18px 20px', color: 'var(--ok)', fontSize: 12.5, textAlign: 'center' }}>— ไม่มี —</div>}
        </div>
      </div>
    </div>
  )
}
