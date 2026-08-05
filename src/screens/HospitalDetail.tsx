import { useEffect, useState } from 'react'
import { ROLE_TH } from '../state'
import { thDate, thDateTime } from '../hooks'
import { Loading } from '../components/Spinner'
import { DataTable } from '../components/data-display/DataTable'
import { toast } from '../components/dialog'
import { api } from '../api'
import { card, HEALTH_TH, Pill, td, th, theadTr, type Flag, type Tenant } from './tenantsCommon'

// รายละเอียดโรงพยาบาล (modal 360°) — ข้อมูล/สถานะ/การใช้งาน/ผู้ใช้/โน้ต/ประวัติ

type User = { username: string; display_name: string; role: string; active: boolean; last_login_at: string | null }
type AuditRow = { ts: string; actor: string; action: string; detail: string }
type Detail = {
  tenant: Tenant
  users: User[]
  audit: AuditRow[]
  usage: { active_staff: number | null; enrolled: number | null; punched_today: number | null }
}


function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  )
}

export function HospitalDetail({ hcode, onClose, onChanged }: { hcode: string; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<Detail>(`/admin/tenants/${hcode}/detail`)
      .then((r) => { setD(r); setNote(r.tenant?.note ?? '') })
      .catch((e) => setErr(e?.message || 'โหลดไม่สำเร็จ'))
  }, [hcode])

  const saveMeta = async (body: { note?: string; health?: string }) => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      await api.post(`/admin/tenants/${hcode}/meta`, body)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
      toast.success('บันทึกแล้ว')
      onChanged()
      if (d) setD({ ...d, tenant: { ...d.tenant,
        ...(body.health ? { health: body.health as Tenant['health'] } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}) } })
    } catch (e: any) { setErr(e?.message || 'บันทึกไม่สำเร็จ') } finally { setBusy(false) }
  }

  // flag ความปลอดภัยรายโรง — วน ใช้ค่ากลาง(null) → เปิด(true) → ปิด(false) → กลับค่ากลาง
  const nextFlag = (f: Flag): boolean | null => (!f.override ? true : f.value ? false : null)
  const setFlag = async (flag: string, value: boolean | null) => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const r = await api.post<{ tenants: Tenant[] }>(`/admin/tenants/${hcode}/flag`, { flag, value })
      const me = r.tenants.find((x) => x.hcode === hcode)
      if (d && me) setD({ ...d, tenant: me })
      onChanged()
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e: any) { setErr(e?.message || 'ทำรายการไม่สำเร็จ') } finally { setBusy(false) }
  }

  const t = d?.tenant
  const hb = HEALTH_TH[t?.health ?? 'ok']

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 15 }}>{t?.name ?? hcode} <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)', fontWeight: 400 }}>{hcode}</span></div>
          </div>
          {t && (
            <select className="nice-select" value={t.health} disabled={busy}
              onChange={(e) => saveMeta({ health: e.target.value })}
              title="ธงติดตามลูกค้า (มุมมองทีมดูแล)"
              style={{ color: hb.color, fontWeight: 500 }}>
              {Object.entries(HEALTH_TH).map(([v, h]) => <option key={v} value={v}>{h.label}</option>)}
            </select>
          )}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ok)', opacity: saved ? 1 : 0, transition: 'opacity .25s' }}>บันทึกแล้ว ✓</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}
          {!d && !err && <Loading />}

          {t && (
            <>
              {/* ข้อมูล + สถานะ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 10 }}>
                <Info label="ผู้ติดต่อ" value={t.contact_name} />
                <Info label="เบอร์โทร" value={t.contact_phone} />
                <Info label="อีเมล" value={t.contact_email} />
                <Info label="จังหวัด" value={t.province} />
                <Info label="ประเภท" value={t.request_type === 'demo' ? `ทดลองใช้ ถึง ${t.demo_expires_at ?? '—'}` : t.prod_expires_at ? `ใช้งานจริง ถึง ${t.prod_expires_at}` : 'ใช้งานจริง (ถาวร)'} />
                <Info label="อนุมัติโดย" value={t.approved_by ? `${t.approved_by} · ${thDate(t.approved_at)}` : '—'} />
                <Info label="ยื่นคำขอเมื่อ" value={thDate(t.requested_at)} />
              </div>

              {/* ค่าความปลอดภัยรายโรง (ย้ายมาจากตารางรวม) */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>ค่าความปลอดภัยรายโรง <span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-faint)' }}>— • = ตั้งเฉพาะโรงนี้ ต่างจากค่ากลาง</span></div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-dim)' }}>
                    โหมดทดสอบ
                    <span title="แสดงอย่างเดียว — โหมดทดสอบตั้งผ่านระบบ (deploy) · เปิด = ลงเวลาผ่านทุกขั้นแต่ไม่บันทึกฐานโรงจริง"
                      style={{ fontSize: 11.5, fontWeight: 500, padding: '4px 12px', borderRadius: 20, background: t.dry_run.value ? 'var(--danger-light)' : 'var(--ok-light)', color: t.dry_run.value ? 'var(--danger)' : 'var(--ok)', border: `1px solid ${t.dry_run.value ? 'var(--danger)' : 'var(--ok)'}` }}>
                      {t.dry_run.value ? 'ทดสอบ' : 'ใช้จริง'}{t.dry_run.override ? ' •' : ''}
                    </span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-dim)' }}>
                    ตรวจตัวตน
                    <Pill label={t.auth_enforce.value ? 'เปิด' : 'ปิด'} tone={t.auth_enforce.value ? 'ok' : 'off'} override={t.auth_enforce.override} disabled={busy} onClick={() => setFlag('auth_enforce', nextFlag(t.auth_enforce))} />
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-dim)' }}>
                    ตรวจสิทธิ์
                    <Pill label={t.eligibility_check.value ? 'เปิด' : 'ปิด'} tone={t.eligibility_check.value ? 'ok' : 'off'} override={t.eligibility_check.override} disabled={busy} onClick={() => setFlag('eligibility_check', nextFlag(t.eligibility_check))} />
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-dim)' }}
                    title="เปิดได้เมื่อโรงรัน SQL เพิ่มคอลัมน์ emp_in_out_status_id / emp_in_out_diff_minute แล้ว — เปิด = บันทึกและอ่านสถานะจากฐานโรงจริง · ปิด = ระบบคำนวณสาย/นาทีเองจากเวลาเวร">
                    เก็บสถานะลงเวลา
                    <Pill label={t.has_status.value ? 'เปิด' : 'ปิด'} tone={t.has_status.value ? 'ok' : 'off'} override={t.has_status.override} disabled={busy}
                      onClick={() => setFlag('has_status', t.has_status.value ? false : true)} />
                  </span>
                </div>
              </div>

              {/* การใช้งาน */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>การใช้งาน</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 10 }}>
                  {([['พนักงานทั้งหมด', d!.usage.active_staff], ['ลงทะเบียนหน้าแล้ว', d!.usage.enrolled], ['ลงเวลาวันนี้', d!.usage.punched_today]] as const).map(([l, v]) => (
                    <div key={l} style={{ background: 'var(--surface-card)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 19, fontWeight: 500, fontFamily: 'var(--mono)' }}>{v ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>— = ต่อระบบโรงไม่ได้ตอนนี้ (ดูหน้าสถานะระบบ)</div>
              </div>

              {/* ผู้ใช้ของโรง */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>ผู้ใช้ dashboard ของโรงนี้</div>
                {d!.users.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>ยังไม่มี — สร้างได้ที่ "ผู้ใช้และสิทธิ์"</div>
                ) : (
                  <DataTable<User>
                    rows={d!.users} rowKey={(u) => u.username} stickyTop={0}
                    divider="top" hover={false} theadRowStyle={theadTr} thBase={th} tdBase={{ ...td, fontSize: 12.5 }}
                    columns={[
                      { key: 'no', header: 'ลำดับ', align: 'right', width: 56,
                        tdStyle: { fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11.5 },
                        cell: (_u, i) => i + 1 },
                      { key: 'user', header: 'ผู้ใช้',
                        cell: (u) => <><b>{u.display_name || u.username}</b> <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)' }}>@{u.username}</span></> },
                      { key: 'role', header: 'บทบาท', cell: (u) => ROLE_TH[u.role] ?? u.role },
                      { key: 'active', header: 'สถานะ',
                        tdStyle: (u) => ({ color: u.active ? 'var(--ok)' : 'var(--danger)' }),
                        cell: (u) => (u.active ? 'ใช้งาน' : 'ปิด') },
                      { key: 'last', header: 'เข้าระบบล่าสุด', align: 'right',
                        tdStyle: { fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)' },
                        cell: (u) => (u.last_login_at ? thDateTime(u.last_login_at) : 'ยังไม่เคย') },
                    ]}
                  />
                )}
              </div>

              {/* โน้ตภายใน */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>โน้ตภายใน <span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-faint)' }}>— ทีมดูแลเห็นเท่านั้น โรงไม่เห็น</span></div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="เช่น โทรคุยแล้ว สนใจเปิดใช้งานจริง รอใบเสนอราคา…"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-card)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', resize: 'vertical' }} />
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => saveMeta({ note })} disabled={busy || note === (t.note ?? '')}
                    style={{ fontSize: 12.5, fontWeight: 500, padding: '8px 16px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', opacity: note === (t.note ?? '') ? 0.5 : 1 }}>
                    {busy ? 'กำลังบันทึก…' : 'บันทึกโน้ต'}
                  </button>
                </div>
              </div>

              {/* ประวัติเฉพาะโรงนี้ */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>ประวัติการจัดการล่าสุด</div>
                {d!.audit.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>ยังไม่มีรายการ</div> : (
                  d!.audit.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 12.5 }}>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-faint)', fontSize: 11.5, flex: 'none' }}>{a.ts}</span>
                      <span style={{ fontWeight: 500 }}>{a.actor}</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{a.action}</span>
                      <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
