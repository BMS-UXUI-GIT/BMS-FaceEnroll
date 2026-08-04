import { useEffect, useMemo, useState } from 'react'
import { Loading } from '../components/Spinner'
import { api } from '../api'
import { dialog } from '../components/dialog'
import { Icon } from '../icons'
import { Info } from '../components/Info'
import { Pager, usePaged } from '../components/Pager'
import { nf, thDate } from '../hooks'
import { HospitalDetail } from './HospitalDetail'
import { card, HEALTH_TH, notifyBadges, td, th, theadTr, type Tenant } from './tenantsCommon'

// จัดการโรงพยาบาล — โรงที่เปิดใช้งานแล้ว + ฟิลเตอร์ + วันหมดอายุ + สถานะเชื่อมต่อระบบโรง
// (flag โหมดทดสอบ/ตรวจตัวตน/ตรวจสิทธิ์ ย้ายไปอยู่ใน popup รายละเอียดโรง)

const STATUS_FILTERS = [
  ['all', 'ทุกสถานะ'], ['real', 'ใช้งานจริง'], ['demo', 'ทดลองใช้'],
  ['demo_expired', 'หมดอายุทดลอง'], ['paused', 'พักใช้'],
] as const

type HospHealth = { ok: boolean; latency_ms: number; error: string }

// เหลือกี่วันถึงวันหมดอายุ (นับถึงสิ้นวันนั้น) — null = ไม่มีวันหมด/รูปแบบผิด
function daysLeft(d?: string | null): number | null {
  if (!d) return null
  const t = new Date(`${d}T23:59:59`)
  if (isNaN(t.getTime())) return null
  return Math.floor((t.getTime() - Date.now()) / 86400000)
}

function ExpiryChip({ date }: { date?: string | null }) {
  const n = daysLeft(date)
  if (n === null) return null
  const tone = n < 0 ? 'var(--danger)' : n <= 7 ? 'var(--warn)' : 'var(--text-dim)'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: tone }}>
      {n < 0 ? `เกินมา ${-n} วัน` : n === 0 ? 'หมดวันนี้' : `เหลือ ${n} วัน`}
    </span>
  )
}

export function SystemHospitals() {
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [health, setHealth] = useState<Record<string, HospHealth> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState<string>('all')
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ tenants: Tenant[] }>('/admin/tenants').then((d) => setTenants(d.tenants)).catch((e) => setErr(e?.message || 'โหลดไม่สำเร็จ'))
  }, [])

  // สถานะ pharm ต่อโรง — เช็คสดทีหลัง ไม่บล็อกตาราง (ล้มก็แค่โชว์ —)
  useEffect(() => {
    let alive = true
    api.get<{ hospitals: (HospHealth & { hcode: string })[] }>('/admin/health')
      .then((d) => alive && setHealth(Object.fromEntries((d.hospitals ?? []).map((h) => [h.hcode, h]))))
      .catch(() => alive && setHealth({}))
    return () => { alive = false }
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

  const rows = useMemo(() => {
    let list = (tenants ?? []).filter((t) => t.status !== 'pending')
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter((t) => t.hcode.includes(s) || (t.name || '').toLowerCase().includes(s)
        || (t.province || '').toLowerCase().includes(s) || (t.contact_name || '').toLowerCase().includes(s))
    }
    if (statusF === 'real') list = list.filter((t) => t.request_type === 'real' && t.active)
    if (statusF === 'demo') list = list.filter((t) => t.request_type === 'demo' && !t.demo_expired && t.active)
    if (statusF === 'demo_expired') list = list.filter((t) => t.demo_expired)
    if (statusF === 'paused') list = list.filter((t) => !t.active)
    return list
  }, [tenants, q, statusF])
  const paged = usePaged(rows)

  const hs = (hcode: string) => {
    if (health === null) return <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>กำลังเช็ค…</span>
    const h = health[hcode]
    if (!h) return <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>—</span>
    return (
      <span title={h.ok ? `ตอบใน ${nf(h.latency_ms)} ms` : h.error} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: h.ok ? 'var(--ok)' : 'var(--danger)' }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: h.ok ? 'var(--ok)' : 'var(--danger)' }}>
          {h.ok ? `ปกติ · ${nf(h.latency_ms)} ms` : 'ต่อไม่ได้'}
        </span>
      </span>
    )
  }

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>โรงพยาบาลที่เปิดใช้งาน</h2>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>คลิกชื่อโรงดูรายละเอียด<Info text="คลิกชื่อโรง = รายละเอียด ผู้ติดต่อ โน้ต ผู้ใช้ + ตั้งค่าความปลอดภัยรายโรง (โหมดทดสอบ/ตรวจตัวตน/ตรวจสิทธิ์)" /></span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-card)' }}>
              <Icon name="search" size={14} color="var(--text-faint)" width={1.8} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นรหัส / ชื่อโรง / จังหวัด…"
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, fontFamily: 'var(--sans)', color: 'var(--text)', width: 190 }} />
            </div>
            <select className="nice-select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
              {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Pager page={paged.page} total={paged.total} onPage={paged.setPage} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
            <thead><tr style={theadTr}>
              <th style={{ ...th, padding: '10px 20px', textAlign: 'right', width: 56 }}>ลำดับ</th>
              <th style={{ ...th, padding: '10px 20px' }}>รหัส</th>
              <th style={th}>ชื่อโรงพยาบาล</th>
              <th style={th}>จังหวัด</th>
              <th style={th}>ประเภท<Info text="ทดลองใช้ = มีวันหมดอายุ (ต่อได้ทีละ 60 วัน) · ใช้งานจริง = ถาวรหรือถึงวันที่กำหนด — โชว์วันหมด + เหลือกี่วัน" /></th>
              <th style={th}>ระบบโรง<Info text="เช็คการเชื่อมต่อระบบของโรง (HOSxP ผ่าน pharm) แบบสดตอนเปิดหน้านี้ — ต่อไม่ได้ = แอปโรงนั้นลงเวลาไม่เข้า" /></th>
              <th style={{ ...th, padding: '10px 20px', textAlign: 'right' }}>สถานะ<Info text="ใช้งาน / พักใช้ (ปิดชั่วคราว ข้อมูลไม่หาย) — กดปุ่มเพื่อสลับ" /></th>
            </tr></thead>
            <tbody>
              {paged.pageRows.map((t, i) => (
                <tr key={t.hcode} className="row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...td, padding: '11px 20px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 12 }}>{nf(paged.offset + i + 1)}</td>
                  <td style={{ ...td, padding: '11px 20px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{t.hcode}</td>
                  <td style={td}>
                    <button onClick={() => setDetail(t.hcode)} title="ดูรายละเอียดโรง"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, padding: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: HEALTH_TH[t.health ?? 'ok'].color }} title={`การติดตามลูกค้า: ${HEALTH_TH[t.health ?? 'ok'].label}`} />
                      <span style={{ fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'var(--border)', textUnderlineOffset: 3 }}>{t.name || '—'}</span>
                    </button>
                  </td>
                  <td style={{ ...td, color: 'var(--text-dim)' }}>{t.province || '—'}</td>
                  <td style={td}>
                    {t.request_type === 'demo' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: t.demo_expired ? 'var(--danger)' : 'var(--info)', background: t.demo_expired ? 'var(--danger-light)' : 'var(--info-light)' }}>
                          {t.demo_expired ? 'หมดอายุทดลอง' : 'ทดลองใช้'}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                          {t.approved_at ? `${thDate(t.approved_at)} – ` : 'หมด '}{thDate(t.demo_expires_at)}
                        </span>
                        <ExpiryChip date={t.demo_expires_at} />
                        <button onClick={async () => {
                          const raw = await dialog.prompt({
                            title: `ต่ออายุทดลองใช้ ${t.name}`, label: 'จำนวนวัน (1-365)', initial: '60', mono: true, confirmText: 'ต่ออายุ',
                            validate: (v) => { const n = Number(v.trim()); return Number.isInteger(n) && n >= 1 && n <= 365 ? null : 'ใส่จำนวนวัน 1-365' },
                          })
                          if (raw === null) return
                          act(`ex:${t.hcode}`, `/admin/tenants/${t.hcode}/extend-demo`, { days: Number(raw.trim()) })
                        }}
                          disabled={!!busy}
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>
                          {busy === `ex:${t.hcode}` ? '…' : '+ ต่ออายุ'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: 'var(--accent-active)', background: 'var(--accent-light)' }}>
                          {t.prod_expires_at ? `ใช้งานจริง ถึง ${thDate(t.prod_expires_at)}` : 'ใช้งานจริง'}
                        </span>
                        <ExpiryChip date={t.prod_expires_at} />
                      </div>
                    )}
                  </td>
                  <td style={td}>{hs(t.hcode)}</td>
                  <td style={{ ...td, padding: '11px 20px', textAlign: 'right' }}>
                    <button onClick={() => act(`ac:${t.hcode}`, `/admin/tenants/${t.hcode}/active`, { active: !t.active })} disabled={!!busy} title="เปิด/พัก การใช้งานของโรงนี้"
                      style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--sans)', minWidth: 62, background: t.active ? 'var(--ok-light)' : 'var(--danger-light)', color: t.active ? 'var(--ok)' : 'var(--danger)', border: `1px solid ${t.active ? 'var(--ok)' : 'var(--danger)'}` }}>
                      {busy === `ac:${t.hcode}` ? '…' : t.active ? 'ใช้งาน' : 'พัก'}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants && rows.length === 0 && <tr><td colSpan={7} style={{ ...td, padding: '20px', color: 'var(--text-faint)', textAlign: 'center' }}>{q || statusF !== 'all' ? 'ไม่พบโรงที่ตรงเงื่อนไข' : 'ยังไม่มีโรงเปิดใช้งาน — โรงยื่นคำขอผ่านฟอร์ม แล้วอนุมัติที่เมนู "อนุมัติโรงพยาบาล"'}</td></tr>}
              {!tenants && !err && <tr><td colSpan={7} style={{ padding: 0 }}><Loading /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <HospitalDetail hcode={detail} onClose={() => setDetail(null)}
        onChanged={() => api.get<{ tenants: Tenant[] }>('/admin/tenants').then((d) => setTenants(d.tenants)).catch((e) => setErr(e?.message || 'โหลดไม่สำเร็จ'))} />}
    </div>
  )
}
