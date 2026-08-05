import { useState } from 'react'
import { nf, useFetch } from '../hooks'
import { Info } from '../components/Info'
import { Loading } from '../components/Spinner'
import { SectionPanel } from '../components/layout/SectionPanel'
import { Button } from '../components/inputs/Button'
import { StatCard } from '../components/data-display/StatCard'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp, type Nav } from '../state'

// Dashboard ระดับระบบ (super/ส่วนกลาง) — เห็นเมื่อเลือก "ทุกโรงพยาบาล"
// ใช้ชุดเดียวกับหน้าอื่น: การ์ดหัวเรื่องไล่สีฟ้า + StatCard + SectionPanel

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

// ไอคอนชุดเดียวกับการ์ดสรุปด้านบน — ป้ายกับการ์ดสถานะเดียวกันจะได้อ่านออกว่าเป็นเรื่องเดียวกัน
const BUCKET: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'รออนุมัติ', color: 'var(--warn)', icon: 'hourglass' },
  demo: { label: 'ทดลองใช้', color: 'var(--info)', icon: 'flask' },
  demo_expiring: { label: 'ใกล้หมดอายุ', color: 'var(--warn)', icon: 'hourglass-low' },
  demo_expired: { label: 'หมดอายุทดลอง', color: 'var(--danger)', icon: 'hourglass-off' },
  real: { label: 'ใช้งานจริง', color: 'var(--ok)', icon: 'rosette-check' },
  suspended: { label: 'พักใช้', color: 'var(--text-dim)', icon: 'player-pause' },
  rejected: { label: 'ปฏิเสธ', color: 'var(--text-dim)', icon: 'ban' },
}

/** ป้ายสถานะโรง — ทรงเดียวกับ StatusBadge ของหน้าอื่น (พื้นอ่อน ไม่มีขอบ + วงกลมไอคอน 26px) */
function Badge({ bucket }: { bucket: string }) {
  const b = BUCKET[bucket] ?? { label: bucket, color: 'var(--text-dim)', icon: 'info' }
  return (
    <span style={{
      ...TEXT.sm, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', minHeight: 36,
      padding: 'var(--sp-1) var(--sp-3) var(--sp-1) var(--sp-2)', borderRadius: 'var(--r-full)',
      color: b.color, background: `color-mix(in srgb, ${b.color} 12%, transparent)`,
    }}>
      <span aria-hidden style={{
        width: 26, height: 26, flex: 'none', borderRadius: 'var(--r-full)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: b.color, color: 'var(--bg)',
      }}>
        <Icon name={b.icon} size={14} width={2} />
      </span>
      {b.label}
    </span>
  )
}

export function usePlatformOverview(reload = 0) {
  return useFetch<Data>('/admin/platform/overview', reload)
}

type Kpi = { v?: number; label: string; tone: 'accent' | 'warn' | 'info' | 'danger' | 'ok' | 'neutral'; icon: string; tip: string; nav?: Nav }
function kpisOf(d?: Data | null): Kpi[] {
  const c = d?.counts ?? {}
  return [
    { v: d?.total, label: 'โรงพยาบาลทั้งหมด', tone: 'accent', icon: 'hospital', tip: 'จำนวนโรงพยาบาลทั้งหมดในระบบ นับทุกสถานะรวมกัน' },
    { v: c.pending, label: 'รออนุมัติ', tone: 'warn', icon: 'hourglass', tip: 'โรงที่ยื่นคำขอผ่านฟอร์มลงทะเบียน กำลังรอผู้ดูแลกดอนุมัติ — กดการ์ดนี้เพื่อไปหน้าอนุมัติ', nav: 'sys-approve' },
    { v: c.demo, label: 'ทดลองใช้', tone: 'info', icon: 'flask', tip: 'โรงที่อนุมัติแบบทดลองใช้ (ฟรี 60 วัน) และยังเหลือเวลาเกิน 7 วัน' },
    { v: c.demo_expiring, label: 'ใกล้หมดอายุ', tone: 'warn', icon: 'hourglass-low', tip: 'โรงทดลองใช้ที่เหลือเวลาไม่เกิน 7 วันก่อนหมดอายุ — ควรติดต่อเพื่อต่ออายุหรือเปิดใช้งานจริง' },
    { v: c.demo_expired, label: 'หมดอายุทดลอง', tone: 'danger', icon: 'hourglass-off', tip: 'โรงทดลองใช้ที่เลยวันหมดอายุแล้ว — พนักงานลงเวลาไม่ได้จนกว่าจะต่ออายุ' },
    { v: c.real, label: 'ใช้งานจริง', tone: 'ok', icon: 'rosette-check', tip: 'โรงที่อนุมัติแบบใช้งานจริง (เปิดถาวร ไม่มีวันหมดอายุ)' },
    { v: c.suspended, label: 'พักใช้', tone: 'neutral', icon: 'player-pause', tip: 'โรงที่ถูกสั่งพักการใช้งานชั่วคราว (ข้อมูลไม่ถูกลบ เปิดกลับมาได้)' },
    { v: c.rejected, label: 'ปฏิเสธ', tone: 'neutral', icon: 'ban', tip: 'คำขอลงทะเบียนที่ผู้ดูแลกดปฏิเสธ (พร้อมเหตุผล) — โรงยื่นคำขอใหม่ได้' },
  ]
}

/** การ์ดสรุป 8 ใบ — วางในหัวเรื่องได้ (หน้าหลักของ super ฝังไว้ในการ์ดไล่สีฟ้า) */
export function PlatformStats({ d, loading }: { d?: Data | null; loading?: boolean }) {
  const { setNav } = useApp()
  return (
    // Figma: แถวละ 4 ใบ (8 ใบ = 2 แถวพอดี) จอแคบค่อยลดเป็น 2/1
    <div className="stat-grid-4 grid gap-2">
      {kpisOf(d).map((k) => (
        <StatCard key={k.label} tone={k.tone} unit="โรง"
          label={<>{k.label}<Info text={k.tip} /></>}
          icon={<Icon name={k.icon} size={24} color="currentColor" />}
          value={k.v != null ? nf(k.v) : loading ? '…' : '—'}
          onClick={k.nav ? () => setNav(k.nav!) : undefined} />
      ))}
    </div>
  )
}

/** แผงด้านล่าง (คำขอล่าสุด · ต้องติดตาม) — สัดส่วนสถานะตัดออก ซ้ำกับการ์ดสรุปด้านบน */
export function PlatformPanels({ d, err }: { d?: Data | null; err?: string | null }) {
  const { setNav } = useApp()

  return (
    <div className="flex flex-col gap-4">
      {err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
        <div className="flex flex-col gap-4">
          {/* ---------- คำขอลงทะเบียนล่าสุด ---------- */}
          <SectionPanel title="คำขอลงทะเบียนล่าสุด"
            actions={
              <Button variant="ghost" size="sm" pill onClick={() => setNav('sys-approve')}
                iconRight={<Icon name="chevron-down" size={16} width={2} style={{ transform: 'rotate(-90deg)' }} />}>
                ไปหน้าอนุมัติ
              </Button>
            }>
            {!d ? <Loading /> : d.recent.length === 0 ? (
              <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--text-dim)', textAlign: 'center' }}>ยังไม่มีคำขอ</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {d.recent.map((r) => (
                  <div key={r.hcode} className="row-hover" onClick={() => setNav(r.bucket === 'pending' ? 'sys-approve' : 'sys-hospitals')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', cursor: 'pointer',
                      padding: 'var(--sp-3)', border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
                    }}>
                    <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', width: 56, flex: 'none' }}>{r.hcode}</span>
                    <span style={{ ...TEXT.bodyMed, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{r.requested_at?.slice(0, 10) ?? ''}</span>
                    <Badge bucket={r.bucket} />
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>

        {/* ---------- ต้องติดตาม ---------- */}
        <SectionPanel
          title={<span style={{ color: 'var(--danger)' }}>ต้องติดตาม<Info text="รวมโรงทดลองใช้ที่ใกล้หมดอายุ (≤7 วัน) และที่หมดอายุแล้ว เรียงจากด่วนสุด" /></span>}
          meta={d ? `${nf(d.follow_up.length)} โรง` : undefined}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)',
            padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-lg)',
            background: 'var(--danger-light)', color: 'var(--text-dim)', ...TEXT.body,
          }}>
            <Icon name="alert" size={20} width={1.8} color="var(--danger)" />
            ทดลองใช้ใกล้หมดอายุ / หมดอายุแล้ว — ติดต่อโรงเพื่อต่ออายุหรือเปิดใช้งานจริง
          </div>

          {!d ? <Loading /> : d.follow_up.length === 0 ? (
            <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--ok)', textAlign: 'center' }}>ไม่มีโรงที่ต้องติดตาม — เรียบร้อยดี</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {d.follow_up.map((r) => (
                <div key={r.hcode} className="row-hover" onClick={() => setNav('sys-hospitals')}
                  style={{
                    cursor: 'pointer', padding: 'var(--sp-3)',
                    border: '1px solid var(--control-border)', borderRadius: 'var(--r-lg)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span style={{ ...TEXT.bodyMed, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <Badge bucket={r.bucket} />
                  </div>
                  <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 'var(--sp-1)' }}>
                    {r.demo_days_left != null && r.demo_days_left >= 0
                      ? `เหลือ ${r.demo_days_left} วัน (ถึง ${r.demo_expires_at})`
                      : `หมดอายุแล้ว ${r.demo_expires_at ?? ''}`}
                    {r.contact_phone ? ` · ${r.contact_name} ${r.contact_phone}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  )
}

/** หน้าเดี่ยว (เผื่อเรียกใช้ตรง ๆ) — หัวเรื่อง + การ์ดสรุป + แผง */
export function PlatformOverview() {
  const [reload, setReload] = useState(0)
  const { data: d, err, loading } = usePlatformOverview(reload)
  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">ภาพรวมระบบ</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              สถานะโรงพยาบาลทั้งหมดในระบบ · คำขอลงทะเบียน · โรงที่ต้องติดตาม
            </p>
          </div>
          <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={loading ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรช
          </Button>
        </div>
        <div className="relative mt-4"><PlatformStats d={d} loading={loading} /></div>
      </div>
      <PlatformPanels d={d} err={err} />
    </div>
  )
}
