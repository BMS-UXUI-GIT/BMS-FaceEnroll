import { useEffect, useState } from 'react'
import { thDate } from '../hooks'
import { Loading } from '../components/Spinner'
import { api } from '../api'
import { dialog } from '../components/dialog'
import { card, notifyBadges, type Tenant } from './tenantsCommon'

// อนุมัติโรงพยาบาล — คิวคำขอจากฟอร์มลงทะเบียน (URL /hospital-request)

export function SystemApprove() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ tenants: Tenant[] }>('/admin/tenants').then((d) => setTenants(d.tenants)).catch((e) => setErr(e?.message || 'โหลดไม่สำเร็จ'))
  }, [])

  const act = async (key: string, path: string, body: unknown, confirmMsg?: string) => {
    if (busy) return
    if (confirmMsg && !(await dialog.confirm({ body: confirmMsg }))) return
    setBusy(key); setErr(null)
    try {
      const r = await api.post<{ tenants: Tenant[] }>(path, body)
      setTenants(r.tenants); notifyBadges()
    } catch (e: any) { setErr(e?.message || 'ทำรายการไม่สำเร็จ') } finally { setBusy(null) }
  }

  const pending = (tenants ?? []).filter((t) => t.status === 'pending')

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>คำขอรออนุมัติ</h2>
          {pending.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--warn)', color: 'var(--bg)', borderRadius: 20, padding: '1px 9px' }}>{pending.length}</span>}
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>อนุมัติทดลองใช้ = เปิด 60 วันนับจากวันนี้ · ใช้งานจริง = เปิดถาวร</span>
        </div>

        {pending.map((t, i) => (
          <div key={t.hcode} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ flex: 'none', fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-faint)', minWidth: 18, textAlign: 'right' }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{t.name || '—'}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>{t.hcode}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 5, background: t.request_type === 'demo' ? 'var(--info-light)' : 'var(--accent-light)', color: t.request_type === 'demo' ? 'var(--info)' : 'var(--accent-active)' }}>
                  {t.request_type === 'demo' ? 'ขอทดลองใช้' : 'ขอใช้งานจริง'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                ผู้ติดต่อ: {t.contact_name || '—'} · {t.contact_phone || '—'}{t.contact_email ? ` · ${t.contact_email}` : ''}
                {t.requested_at ? ` · ยื่นเมื่อ ${thDate(t.requested_at)}` : ''}
              </div>
            </div>
            <button onClick={() => act(`ap:${t.hcode}`, `/admin/tenants/${t.hcode}/approve`, { demo_days: 60 },
              t.request_type === 'demo' ? `อนุมัติ ${t.name} แบบทดลองใช้ 60 วัน?` : `อนุมัติ ${t.name} ใช้งานจริง?`)}
              disabled={!!busy}
              style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 9, border: 'none', background: 'var(--ok)', color: 'var(--bg)', cursor: 'pointer' }}>
              {busy === `ap:${t.hcode}` ? 'กำลังอนุมัติ…' : t.request_type === 'demo' ? 'อนุมัติ (60 วัน)' : 'อนุมัติ'}
            </button>
            <button onClick={async () => {
              const reason = await dialog.prompt({ title: `ปฏิเสธคำขอของ ${t.name}`, label: 'เหตุผลที่ปฏิเสธ (โรงเห็นข้อความนี้)', initial: 'ข้อมูลผู้ติดต่อไม่ครบถ้วน', confirmText: 'ปฏิเสธคำขอ' })
              if (reason !== null) act(`rj:${t.hcode}`, `/admin/tenants/${t.hcode}/reject`, { reason: reason.trim() })
            }}
              disabled={!!busy}
              style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer' }}>
              ปฏิเสธ
            </button>
          </div>
        ))}
        {tenants && pending.length === 0 && (
          <div style={{ padding: '26px 20px', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center' }}>ไม่มีคำขอรออนุมัติ</div>
        )}
        {!tenants && !err && <Loading />}
      </div>
    </div>
  )
}
