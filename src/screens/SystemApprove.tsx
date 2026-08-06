import { useEffect, useState } from 'react'
import { thDate } from '../hooks'
import { api } from '../api'
import { dialog, toast } from '../components/dialog'
import { SectionPanel } from '../components/layout/SectionPanel'
import { HeroArt } from '../components/HeroArt'
import { Skel } from '../components/Skeleton'
import { StatCard } from '../components/data-display/StatCard'
import { nf } from '../hooks'
import { Button } from '../components/inputs/Button'
import { Icon } from '../icons'
import { TEXT } from '../typography'
import { notifyBadges, type Tenant } from './tenantsCommon'

// อนุมัติโรงพยาบาล — คิวคำขอจากฟอร์มลงทะเบียน (URL /hospital-request)
// โครงหน้าเดียวกับหน้าอื่น: การ์ดหัวเรื่องไล่สี + ภาพประกอบ แล้วตามด้วย SectionPanel

export function SystemApprove() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setTenants(null); setErr(null)
    api.get<{ tenants: Tenant[] }>('/admin/tenants')
      .then((d) => alive && setTenants(d.tenants))
      .catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [reload])

  const act = async (key: string, path: string, body: unknown, confirmMsg?: string) => {
    if (busy) return
    if (confirmMsg && !(await dialog.confirm({ body: confirmMsg }))) return
    setBusy(key); setErr(null)
    try {
      const r = await api.post<{ tenants: Tenant[] }>(path, body)
      setTenants(r.tenants); notifyBadges(); toast.success('ทำรายการแล้ว')
    } catch (e: any) { setErr(e?.message || 'ทำรายการไม่สำเร็จ') } finally { setBusy(null) }
  }

  const pending = (tenants ?? []).filter((t) => t.status === 'pending')
  // การ์ดสรุปในหัวเรื่อง
  const HERO = [
    { label: 'รออนุมัติ', v: tenants ? pending.length : undefined, tone: 'warn' as const, icon: 'hourglass' },
    { label: 'ขอทดลองใช้', v: tenants ? pending.filter((t) => t.request_type === 'demo').length : undefined, tone: 'info' as const, icon: 'flask' },
    { label: 'ขอใช้งานจริง', v: tenants ? pending.filter((t) => t.request_type !== 'demo').length : undefined, tone: 'accent' as const, icon: 'hospital' },
  ]

  return (
    <div className="max-w-(--page-max) flex flex-col gap-4">
      {/* ---------- การ์ดหัวเรื่อง ---------- */}
      <div className="relative overflow-hidden rounded-xl p-6" style={{ background: 'linear-gradient(to top, var(--surface-blue), var(--bg) 65%)' }}>
        <HeroArt icon="rosette-check" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h2 m-0 text-text">อนุมัติโรงพยาบาล</h1>
            <p className="text-body mt-2 mb-0 text-[color-mix(in_srgb,var(--text-faint)_50%,transparent)]">
              คิวคำขอจากฟอร์มลงทะเบียน · อนุมัติทดลองใช้ = เปิด 60 วันนับจากวันนี้ · ใช้งานจริง = เปิดถาวร
            </p>
          </div>
          <Button variant="soft" size="lg" pill onClick={() => setReload((r) => r + 1)}
            icon={<Icon name="recon" size={20} style={!tenants && !err ? { animation: 'spin .7s linear infinite' } : undefined} />}>
            รีเฟรชข้อมูลล่าสุด
          </Button>
        </div>

        <div className="relative mt-4 flex gap-2 flex-wrap">
          {HERO.map((k) => (
            <StatCard key={k.label} tone={k.tone} label={k.label} unit="คำขอ"
              icon={<Icon name={k.icon} size={24} color="currentColor" />}
              value={k.v != null ? nf(k.v) : '…'} />
          ))}
        </div>
      </div>

      {err && <div className="text-body py-3 px-4 rounded-lg bg-danger-light text-danger">ผิดพลาด: {err}</div>}

      {/* ---------- คิวคำขอ ---------- */}
      <SectionPanel title="คำขอรออนุมัติ" meta={tenants ? `${pending.length} คำขอ` : undefined}>
        {!tenants ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {Array.from({ length: 3 }, (_, i) => <Skel key={i} h={84} r="var(--r-lg)" />)}
          </div>
        ) : pending.length === 0 ? (
          <div style={{ ...TEXT.body, padding: '48px 20px', color: 'var(--ok)', textAlign: 'center' }}>
            ไม่มีคำขอรออนุมัติ — เคลียร์หมดแล้ว
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {pending.map((t) => {
              const demo = t.request_type === 'demo'
              return (
                <div key={t.hcode} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
                  padding: 'var(--sp-3) var(--sp-4)', minHeight: 84,
                  background: 'var(--surface-alt)', borderRadius: 'var(--r-lg)',
                }}>
                  <span aria-hidden style={{
                    width: 40, height: 40, flex: 'none', borderRadius: 'var(--r-md)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--accent-light)', color: 'var(--accent-active)',
                  }}>
                    <Icon name="hospital" size={22} width={1.8} />
                  </span>

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      <span style={{ ...TEXT.bodyMed, color: 'var(--text)' }}>{t.name || '—'}</span>
                      <span style={{ ...TEXT.sm, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{t.hcode}</span>
                      <span style={{
                        ...TEXT.caption, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-full)',
                        background: demo ? 'var(--info-light)' : 'var(--accent-light)',
                        color: demo ? 'var(--info)' : 'var(--accent-active)',
                      }}>{demo ? 'ขอทดลองใช้' : 'ขอใช้งานจริง'}</span>
                    </div>
                    <div style={{ ...TEXT.sm, color: 'var(--text-dim)', marginTop: 2 }}>
                      ผู้ติดต่อ: {t.contact_name || '—'} · {t.contact_phone || '—'}{t.contact_email ? ` · ${t.contact_email}` : ''}
                      {t.requested_at ? ` · ยื่นเมื่อ ${thDate(t.requested_at)}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--sp-2)', flex: 'none', flexWrap: 'wrap' }}>
                    <Button variant="primary" size="md" pill disabled={!!busy}
                      icon={<Icon name="rosette-check" size={18} width={1.8} />}
                      onClick={() => act(`ap:${t.hcode}`, `/admin/tenants/${t.hcode}/approve`, { demo_days: 60 },
                        demo ? `อนุมัติ ${t.name} แบบทดลองใช้ 60 วัน?` : `อนุมัติ ${t.name} ใช้งานจริง?`)}>
                      {busy === `ap:${t.hcode}` ? 'กำลังอนุมัติ…' : demo ? 'อนุมัติ (60 วัน)' : 'อนุมัติ'}
                    </Button>
                    <Button variant="ghost-danger" size="md" pill disabled={!!busy}
                      onClick={async () => {
                        const reason = await dialog.prompt({
                          title: `ปฏิเสธคำขอของ ${t.name}`,
                          label: 'เหตุผลที่ปฏิเสธ (โรงพยาบาลเห็นข้อความนี้)',
                          initial: 'ข้อมูลผู้ติดต่อไม่ครบถ้วน',
                          confirmText: 'ปฏิเสธคำขอ',
                        })
                        if (reason !== null) act(`rj:${t.hcode}`, `/admin/tenants/${t.hcode}/reject`, { reason: reason.trim() })
                      }}>
                      ปฏิเสธ
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionPanel>
    </div>
  )
}
