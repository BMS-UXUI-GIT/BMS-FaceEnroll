import { useState, type ReactNode } from 'react'
import { nf, useFetch } from '../hooks'
import { SkelRows } from '../components/Skeleton'
import { SectionPanel } from '../components/layout/SectionPanel'
import { Button } from '../components/inputs/Button'
import { SegmentBar } from '../components/charts'
import { asset } from '../assets'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { useApp } from '../state'

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

/** ตัวเลข 1 ค่า: ป้าย + จำนวน + หน่วย (Figma 444:27557) */
function Stat({ label, value, unit = 'แห่ง', color = 'var(--accent)', align = 'left', big = true, onClick }: {
  label: string
  value: ReactNode
  unit?: string
  color?: string
  align?: 'left' | 'right'
  big?: boolean
  onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      textAlign: align, cursor: onClick ? 'pointer' : undefined, minWidth: 0,
    }}>
      <span style={{ ...TEXT.bodyMed, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
        <span style={{ ...(big ? TEXT.h1 : { ...TEXT.h3 }), color }}>{value}</span>
        <span style={{ ...TEXT.caption, color: 'color-mix(in srgb, var(--text-faint) 40%, transparent)' }}>{unit}</span>
      </span>
    </div>
  )
}

/** หัวข้อกลุ่ม — แถบขาวขอบบาง สูง 40 (Figma 444:27625) */
function GroupHead({ title }: { title: string }) {
  return (
    <div className="rounded-lg" style={{
      display: 'flex', alignItems: 'center', minHeight: 40, padding: '0 var(--sp-4)',
      background: 'var(--bg)', border: '1px solid var(--control-border)', ...TEXT.bodyMed, color: 'var(--text)',
    }}>{title}</div>
  )
}

/** กล่องครอบการ์ดของกลุ่ม (ขาวขอบบาง padding 8) */
function GroupBody({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg" style={{
      flex: 1, background: 'var(--bg)', border: '1px solid var(--control-border)', padding: 'var(--sp-2)',
      display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
    }}>{children}</div>
  )
}

/** การ์ดพื้นเทาในกลุ่ม — ไม่ clip เนื้อหา (ภาพประกอบตามดีไซน์ล้นพ้นขอบบนการ์ดออกมา)
    ส่ง onClick = ทั้งใบกดได้ (มีขอบ + hover ยกขึ้น + โฟกัสด้วยคีย์บอร์ดได้) */
function Tile({ children, style, onClick, label }: {
  children: ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  /** ชื่อที่อ่านออกเสียงตอนโฟกัส (ใช้คู่กับ onClick) */
  label?: string
}) {
  return (
    <div
      className={onClick ? 'rounded-lg lift' : 'rounded-lg'}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? label : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      } : undefined}
      style={{
        position: 'relative', background: 'var(--surface-alt)', padding: 'var(--sp-4)',
        ...(onClick ? { cursor: 'pointer', border: '1px solid var(--control-border)' } : null),
        ...style,
      }}
    >{children}</div>
  )
}

/** ปุ่มลิงก์ในการ์ด — บอกว่าการ์ดใบนี้กดได้ (ไม่ใช่ปุ่มจริง เพราะทั้งใบกดได้อยู่แล้ว)
    ลอยมุมขวาบนของการ์ด ทับภาพประกอบ */
function TileCta({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden style={{
      position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-3)', zIndex: 1,
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
      minHeight: 32, padding: '0 var(--sp-1) 0 var(--sp-3)',
      borderRadius: 'var(--r-full)', ...TEXT.sm, whiteSpace: 'nowrap',
      color: 'var(--accent-active)', background: 'var(--bg)',
      border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
    }}>
      {children}<Icon name="chevron-right" size={16} width={2} />
    </span>
  )
}

/** การ์ดสรุประดับแพลตฟอร์ม — Figma node 444:26753
    ซ้าย  = สถานะการเชื่อมต่อระบบ (จำนวนโรงพยาบาล + ผลตรวจการเชื่อมต่อ)
    ขวา  = สถานะการเปิดใช้งานระบบ (รออนุมัติ / ใช้งานจริง / ทดลองใช้)
    conn = ผลตรวจการเชื่อมต่อจากหน้าสถานะระบบ (ไม่ส่งมา = แผงซ้ายโชว์แค่จำนวนโรงพยาบาล) */
export function PlatformStats({ d, loading, conn }: {
  d?: Data | null
  loading?: boolean
  conn?: { ok?: number; down?: number; loading?: boolean; onOpen?: () => void }
}) {
  const { setNav } = useApp()
  const num = (v?: number, busy?: boolean) => (v != null ? nf(v) : busy ? '…' : '—')
  const c = d?.counts ?? {}

  const ok = conn?.ok ?? 0
  const down = conn?.down ?? 0
  const checked = ok + down
  const pct = (v: number) => (checked > 0 ? `${Math.round((v / checked) * 100)}%` : '—')
  // สถานะส่วนใหญ่ = ฝั่งที่มีจำนวนมากกว่า (พาดหัวของแผงซ้าย)
  const majorOk = ok >= down

  return (
    <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%), 1fr))' }}>
      {/* ══════════ ซ้าย: สถานะการเชื่อมต่อระบบ ══════════ */}
      <div className="flex flex-col gap-2">
        <GroupHead title="สถานะการเชื่อมต่อระบบ" />
        <GroupBody>
          {/* จำนวนโรงพยาบาลทั้งหมด — ภาพตึกชิดซ้าย ตัวเลขชิดขวา */}
          <Tile style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: 148 }}>
            {/* กรอบครอบภาพ: ยื่นพ้นขอบบนการ์ด 10px แต่ก้นกรอบเสมอขอบล่างการ์ด
                overflow:hidden จึงตัดเฉพาะส่วนที่ล้นก้นการ์ด (ตึกโผล่ด้านบน แต่ฐานถูกตัดตรงขอบ) */}
            <span aria-hidden className="pointer-events-none select-none" style={{
              position: 'absolute', left: -4, top: -10, bottom: 0, width: 142,
              overflow: 'hidden', borderBottomLeftRadius: 'var(--r-lg)',
            }}>
              <img src={asset('/ov-hospital.svg')} alt="" width={142} height={112}
                style={{ position: 'absolute', left: 0, top: 0 }} />
            </span>
            <Stat align="right" label="โรงพยาบาลทั้งหมด" value={num(d?.total, loading)}
              onClick={() => setNav('sys-hospitals')} />
          </Tile>

          {/* ผลตรวจการเชื่อมต่อ: พาดหัว + แถบสัดส่วน + 2 ใบย่อย */}
          <Tile
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
            onClick={conn?.onOpen}
            label="ดูหน้าสถานะระบบ"
          >
            {conn?.onOpen && <TileCta>ตรวจสอบการเชื่อมต่อ</TileCta>}
            <div style={{ paddingRight: 190 }}>
              <div style={{ ...TEXT.sm, color: 'color-mix(in srgb, var(--text-faint) 80%, transparent)' }}>สถานะส่วนใหญ่</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-1)', marginTop: 'var(--sp-2)' }}>
                <span style={{ ...TEXT.h3, color: majorOk ? 'var(--ok)' : 'var(--danger)' }}>
                  {majorOk ? 'เชื่อมต่อได้' : 'เชื่อมต่อไม่ได้'}
                </span>
                <span style={{ ...TEXT.caption, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)' }}>
                  {num(majorOk ? conn?.ok : conn?.down, conn?.loading)} แห่ง
                </span>
              </div>
            </div>

            <SegmentBar height={24} segs={[
              { v: down, color: 'var(--danger)', label: 'เชื่อมต่อไม่ได้' },
              { v: ok, color: 'var(--ok)', label: 'เชื่อมต่อได้' },
            ]} />

            {/* ทั้งการ์ดกดได้อยู่แล้ว (Tile onClick) ใบย่อยจึงไม่ผูก onClick ซ้ำ */}
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flex: 1 }}>
              {[
                { icon: 'close', color: 'var(--danger)', label: 'เชื่อมต่อไม่ได้', v: conn?.down },
                { icon: 'check', color: 'var(--ok)', label: 'เชื่อมต่อได้', v: conn?.ok },
              ].map((t) => (
                <div key={t.label} className="bg-bg rounded-xl" style={{
                  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--sp-2)', padding: 'var(--sp-4)',
                }}>
                  <span aria-hidden style={{
                    width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-full)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: t.color, color: 'var(--bg)',
                  }}>
                    <Icon name={t.icon} size={24} width={1.8} />
                  </span>
                  <span style={{ ...TEXT.body, color: 'color-mix(in srgb, var(--text-faint) 60%, transparent)' }}>{t.label}</span>
                  <span style={{ ...TEXT.bodyMed, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {num(t.v, conn?.loading)} แห่ง{t.v != null && checked > 0 ? ` (${pct(t.v)})` : ''}
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        </GroupBody>
      </div>

      {/* ══════════ ขวา: สถานะการเปิดใช้งานระบบ ══════════ */}
      <div className="flex flex-col gap-2">
        <GroupHead title="สถานะการเปิดใช้งานระบบ" />
        <GroupBody>
          {/* คำขอที่รออนุมัติ — ภาพโต๊ะทำงานชิดขวา */}
          <Tile
            style={{ minHeight: 100 }}
            onClick={() => setNav('sys-approve')}
            label={`รออนุมัติ ${num(c.pending, loading)} แห่ง — ไปหน้าอนุมัติคำขอ`}
          >
            {/* ภาพชุดเดียวกับหัวเรื่องหน้าหลัก — ชิดขอบล่างการ์ด จัดกึ่งกลางแนวนอน ส่วนบนล้นพ้นขอบออกไป */}
            <img src={asset('/hero-dash.svg')} alt="" aria-hidden width={236} height={87}
              className="pointer-events-none select-none"
              style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0 }} />
            <Stat label="รออนุมัติ" value={num(c.pending, loading)} color="var(--warn)" />
            <TileCta>ตรวจสอบคำขอ</TileCta>

          </Tile>

          <div style={{ display: 'flex', gap: 'var(--sp-2)', flex: 1, flexWrap: 'wrap' }}>
            {/* เปิดใช้งานถาวร — สถานะที่ใช้งานไม่ได้ตอนนี้ซ้อนอยู่ในการ์ดเดียวกัน (Figma 444:29001) */}
            <div style={{ flex: '1 1 180px', minWidth: 0, display: 'flex' }}>
              <Tile style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <img src={asset('/ov-nurse-phone.svg')} alt="" aria-hidden width={96} height={96}
                  className="pointer-events-none select-none"
                  style={{ position: 'absolute', right: -2, top: -8 }} />
                <div style={{ paddingRight: 84 }}>
                  <Stat label="ใช้งานจริง" value={num(c.real, loading)} color="var(--ok)" />
                </div>

                {/* แถวเล็กในการ์ด — สถานะที่ระบบใช้งานไม่ได้ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', flex: 1 }}>
                  {[
                    { icon: 'lock', label: 'พักการใช้งาน', v: c.suspended },
                    { icon: 'hourglass-off', label: 'หมดอายุทดลอง', v: c.demo_expired },
                    { icon: 'ban', label: 'ถูกปฏิเสธ', v: c.rejected },
                  ].map((r) => (
                    <div key={r.label} className="bg-bg" style={{ borderRadius: 'var(--r-md)', padding: 'var(--sp-2) var(--sp-3)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', ...TEXT.sm, color: 'var(--text-dim)' }}>
                        <Icon name={r.icon} size={16} width={1.8} />
                        {r.label}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', marginTop: 'var(--sp-1)' }}>
                        <span style={{ ...TEXT.h3, color: 'var(--text-dim)' }}>{num(r.v, loading)}</span>
                        <span style={{ ...TEXT.caption, color: 'color-mix(in srgb, var(--text-faint) 40%, transparent)' }}>แห่ง</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Tile>
            </div>

            {/* ช่วงทดลองใช้ */}
            <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <Tile style={{ flex: 1, paddingRight: 82 }}>
                <img src={asset('/ov-flask.svg')} alt="" aria-hidden width={47} height={64}
                  className="pointer-events-none select-none"
                  style={{ position: 'absolute', right: 19, top: '50%', transform: 'translateY(-50%)' }} />
                <Stat label="ทดลองใช้" value={num(c.demo, loading)} color="var(--info)" />
                <p style={{ ...TEXT.caption, color: 'color-mix(in srgb, var(--text-faint) 50%, transparent)', margin: 'var(--sp-3) 0 0' }}>
                  โรงพยาบาลที่กำลังทดลองใช้ แบบฟรี 60 วัน
                </p>
              </Tile>
              <Tile style={{ flex: 1, paddingRight: 82 }}>
                <img src={asset('/ov-expiring.svg')} alt="" aria-hidden width={48} height={64}
                  className="pointer-events-none select-none"
                  style={{ position: 'absolute', right: 24, bottom: 21 }} />
                <Stat label="ใกล้หมดอายุ" value={num(c.demo_expiring, loading)} color="var(--warn)" />
                <p style={{ ...TEXT.caption, color: 'color-mix(in srgb, var(--text-faint) 50%, transparent)', margin: 'var(--sp-3) 0 0' }}>
                  เหลือเวลาใช้งานน้อยกว่า 7 วัน จนกว่าจะต่ออายุ
                </p>
              </Tile>
            </div>
          </div>
        </GroupBody>
      </div>
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
            {!d ? <SkelRows rows={5} avatar={false} /> : d.recent.length === 0 ? (
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
          title={<span style={{ color: 'var(--danger)' }}>ต้องติดตาม</span>}
          meta={d ? `${nf(d.follow_up.length)} แห่ง` : undefined}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)',
            padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-lg)',
            background: 'var(--danger-light)', color: 'var(--text-dim)', ...TEXT.body,
          }}>
            <Icon name="alert" size={20} width={1.8} color="var(--danger)" />
            ทดลองใช้ใกล้หมดอายุ / หมดอายุแล้ว — ติดต่อโรงเพื่อต่ออายุหรือเปิดใช้งานจริง
          </div>

          {!d ? <SkelRows rows={3} avatar={false} /> : d.follow_up.length === 0 ? (
            <div style={{ ...TEXT.body, padding: '32px 20px', color: 'var(--ok)', textAlign: 'center' }}>ไม่มีโรงพยาบาลที่ต้องติดตาม — เรียบร้อยดี</div>
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
          <Button className="btn-refresh" variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
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
