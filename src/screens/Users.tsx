import { useEffect, useMemo, useState } from 'react'
import { ROLE_TH, useApp } from '../state'
import { nf } from '../hooks'
import { Icon } from '../icons'
import { Info } from '../components/Info'
import { Loading } from '../components/Spinner'
import { api } from '../api'
import { dialog } from '../components/dialog'
import { Pager, SearchInput, usePaged } from '../components/Pager'
import { SearchSelect } from '../components/SearchSelect'

// จัดการผู้ใช้และสิทธิ์ (superadmin เท่านั้น) — สร้างบัญชี ตั้งบทบาท เลือกแท็บที่เห็นรายคน

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const field: React.CSSProperties = { padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }

type User = { username: string; display_name: string; role: string; hcodes: string[]; tabs: string[] | null; effective_tabs: string[]; active: boolean; last_login_at: string | null }
type UsersRes = { users: User[]; roles: string[]; all_tabs: string[]; role_default_tabs: Record<string, string[]>; role_tabs: Record<string, string[]> }

// 1 สิทธิ์ = 1 กลุ่มเมนู — ชื่อตรงกับที่ขึ้นในแถบเมนูซ้าย, tip ขึ้นเป็น tooltip ที่ไอคอน ⓘ
const TAB_INFO: Record<string, { name: string; tip: string; danger?: boolean }> = {
  overview: { name: 'Dashboard', tip: 'เปิดเมนู Dashboard' },
  face: { name: 'ลงทะเบียนใบหน้า', tip: 'เปิดเมนู ลงทะเบียนใบหน้า' },
  attendance: { name: 'ลงเวลา', tip: 'เปิดเมนู ลงเวลา และกลุ่มรายงาน·วิเคราะห์ทั้งหมด (รายบุคคล · รายแผนก · รายเวร · การมาสาย/ออกก่อน · รายงาน)' },
  settings: { name: 'ตั้งค่าโรงพยาบาล', tip: 'เปิดเมนู ตั้งค่าแอปสแกน และ จุดลงเวลา — แก้นโยบายการสแกนของโรงได้' },
  health: { name: 'สถานะระบบ', tip: 'เปิดเมนู สถานะระบบ — ดูว่าแต่ละโรงเชื่อมต่อได้ปกติไหม' },
  approve: { name: 'อนุมัติโรงพยาบาล', danger: true, tip: 'เปิดเมนู อนุมัติโรงพยาบาล — รับโรงใหม่เข้าระบบ หรือปฏิเสธคำขอได้' },
  tenants: { name: 'จัดการโรงพยาบาล', danger: true, tip: 'เปิดเมนู จัดการโรงพยาบาล — เปิด–ปิดการใช้งานของโรงไหนก็ได้ในระบบ ต่ออายุเดโม ปักธงเตือน' },
  audit: { name: 'ประวัติการจัดการ', tip: 'เปิดเมนู ประวัติการจัดการ — ดูอย่างเดียว (admin โรงเห็นเฉพาะโรงตัวเอง)' },
  users: { name: 'ผู้ใช้และสิทธิ์', danger: true, tip: 'เปิดเมนู ผู้ใช้และสิทธิ์ — สร้าง–ลบบัญชี รีเซ็ตรหัสผ่าน และให้สิทธิ์คนอื่นได้' },
}

// การ์ดติ๊กสิทธิ์ 1 ใบ — สิทธิ์ระดับระบบใช้สีส้ม, ที่เหลือใช้สีหลัก
function PermCard({ tab, on, busy, onClick }: { tab: string; on: boolean; busy: boolean; onClick: () => void }) {
  const info = TAB_INFO[tab] ?? { name: tab, tip: tab }
  const hi = info.danger ? 'var(--warn)' : 'var(--accent)'
  return (
    <button onClick={onClick} disabled={busy} style={{
      display: 'flex', gap: 8, alignItems: 'center', textAlign: 'left', padding: '9px 11px',
      borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--sans)',
      border: `1px solid ${on ? hi : 'var(--border)'}`,
      background: on ? `color-mix(in srgb, ${hi} 9%, var(--surface))` : 'var(--surface)',
    }}>
      <span style={{
        flex: 'none', width: 16, height: 16, borderRadius: 5, fontSize: 10.5, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${on ? 'transparent' : 'var(--border-strong)'}`,
        background: on ? hi : 'transparent', color: 'var(--on-accent)',
      }}>{on ? '✓' : ''}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: on ? hi : 'var(--text)' }}>{info.name}</span>
      <Info text={info.tip} size={13} />
    </button>
  )
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/
// รหัสผ่าน 6 ตัว ตัดตัวที่อ่านสับสน (0/O, 1/l/I)
const genPassword = () => {
  const cs = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(6)
  crypto.getRandomValues(a)
  return [...a].map((n) => cs[n % cs.length]).join('')
}

export function Users({ me }: { me: string }) {
  const { session } = useApp()
  const [data, setData] = useState<UsersRes | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [q, setQ] = useState('')
  const [hf, setHf] = useState('')   // ฟิลเตอร์โรง: '' = ทุกโรง · '*' = บัญชีส่วนกลาง · อื่น = hcode
  const [editing, setEditing] = useState<string | null>(null)
  // ฟอร์มสร้างใหม่ — เปิด popup แล้วเจนรหัสให้เลย
  const [nu, setNu] = useState({ username: '', password: '', display_name: '', role: 'admin', hcodes: [] as string[] })
  // โชว์บัญชี+รหัสหลังสร้าง/รีเซ็ตสำเร็จ (รหัสเห็นครั้งเดียว — ให้ copy ส่งผู้ใช้)
  const [created, setCreated] = useState<{ username: string; password: string; reset?: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const hospOpts = (session?.hospitals ?? []).filter((h) => h.value !== '*').map((h) => ({ value: h.value, label: h.label, sub: h.value }))
  // ค้นสดจากทะเบียนโรงทั้งประเทศ (ไม่จำกัดแค่โรงที่ลงทะเบียนแล้ว)
  const searchHospitals = (q: string) =>
    api.get<{ hospitals: { hcode: string; name: string }[] }>(`/admin/hospitals/search?q=${encodeURIComponent(q)}&limit=30`)
      .then((d) => (d.hospitals ?? []).map((h) => ({ value: h.hcode, label: h.name || '(ไม่มีชื่อ)', sub: h.hcode })))

  useEffect(() => { api.get<UsersRes>('/admin/users').then(setData).catch((e) => setErr(e?.message || 'โหลดไม่สำเร็จ')) }, [])

  const run = async (fn: () => Promise<UsersRes>) => {
    if (busy) return
    setBusy(true); setErr(null)
    try { setData(await fn()) } catch (e: any) { setErr(e?.message || 'ทำรายการไม่สำเร็จ') } finally { setBusy(false) }
  }

  const create = () => run(async () => {
    const uname = nu.username.trim().toLowerCase()
    const pw = nu.password.trim()
    if (!EMAIL_RE.test(uname)) throw new Error('ชื่อผู้ใช้ต้องเป็นอีเมล เช่น somchai@hospital.go.th')
    if (pw.length < 6) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 6 ตัว')
    const hcodes = nu.role === 'superadmin' || nu.role === 'bmsadmin' ? ['*'] : nu.hcodes
    const r = await api.post<UsersRes>('/admin/users', { ...nu, username: uname, password: pw, hcodes })
    setShowNew(false); setCopied(false); setCreated({ username: uname, password: pw })
    setNu({ username: '', password: '', display_name: '', role: 'admin', hcodes: [] })
    return r
  })

  const patch = (username: string, body: Record<string, unknown>) =>
    run(() => api.patch<UsersRes>(`/admin/users/${encodeURIComponent(username)}`, body))

  const toggleTab = (u: User, tab: string) => {
    const cur = u.effective_tabs
    const next = cur.includes(tab) ? cur.filter((t) => t !== tab) : [...cur, tab]
    patch(u.username, { tabs: next })
  }

  const resetPassword = async (u: User) => {
    const pw = await dialog.prompt({
      title: `ตั้งรหัสผ่านใหม่ให้ ${u.username}`, label: 'รหัสผ่านใหม่ (สุ่มให้แล้ว แก้ได้)', initial: genPassword(), mono: true, confirmText: 'รีเซ็ตรหัส',
      validate: (v) => (v.trim().length >= 6 ? null : 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'),
    })
    if (pw === null) return
    run(async () => {
      const r = await api.patch<UsersRes>(`/admin/users/${encodeURIComponent(u.username)}`, { password: pw.trim() })
      // เด้ง popup ให้ copy อีเมล+รหัสใหม่ส่งผู้ใช้ (จังหวะเดียวที่รหัสยังอ่านได้)
      setCopied(false); setCreated({ username: u.username, password: pw.trim(), reset: true })
      return r
    })
  }

  const remove = async (u: User) => {
    if (await dialog.confirm({ title: 'ลบบัญชี', body: `ลบบัญชี ${u.username}? กู้คืนไม่ได้`, confirmText: 'ลบบัญชี', danger: true }))
      run(() => api.del<UsersRes>(`/admin/users/${encodeURIComponent(u.username)}`))
  }

  // ตัวเลือกฟิลเตอร์ = เฉพาะโรงที่มีบัญชีอยู่จริง (ชื่อโรงจาก scope ของคนที่ login)
  const hospName = (h: string) => (session?.hospitals ?? []).find((x) => x.value === h)?.label || h
  const hospFilters = useMemo(() => {
    const set = new Set<string>()
    for (const u of data?.users ?? []) for (const h of u.hcodes) if (h !== '*') set.add(h)
    return [...set].map((h) => ({ value: h, label: `${hospName(h)} · ${h}` }))
      .sort((a, b) => a.label.localeCompare(b.label, 'th'))
  }, [data, session])
  const hasCentral = (data?.users ?? []).some((u) => u.hcodes.includes('*'))

  const shown = (data?.users ?? []).filter((u) => {
    const t = q.trim().toLowerCase()
    const okQ = !t || u.username.toLowerCase().includes(t) || (u.display_name || '').toLowerCase().includes(t) || u.hcodes.join(',').includes(t)
    const okH = !hf || (hf === '*' ? u.hcodes.includes('*') : u.hcodes.includes(hf))
    return okQ && okH
  })
  const paged = usePaged(shown)

  return (
    <div style={{ maxWidth: 'var(--page-max)' }}>
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>ผู้ใช้และสิทธิ์</h2>
        <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>ตั้งบทบาท + เลือกแท็บที่เห็นได้รายคน (Super Admin เห็นครบเสมอ)</span>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={q} onChange={setQ} placeholder="ค้นชื่อ / บัญชี / โรง…" width={150} />
          <select className="nice-select" value={hf} onChange={(e) => setHf(e.target.value)} title="กรองตามโรงพยาบาล"
            style={{ fontSize: 12, padding: '7px 30px 7px 11px', maxWidth: 230 }}>
            <option value="">ทุกโรงพยาบาล</option>
            {hasCentral && <option value="*">ส่วนกลาง (ดูแลทุกโรง)</option>}
            {hospFilters.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
          <Pager page={paged.page} total={paged.total} onPage={paged.setPage} />
        </div>
        <button onClick={() => { setErr(null); setNu((s) => ({ ...s, password: genPassword() })); setShowNew(true) }} style={{ fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>
          + เพิ่มผู้ใช้
        </button>
      </div>

      {err && !showNew && <div style={{ padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}

      <div>
        {paged.pageRows.map((u, i) => (
          <div key={u.username} style={{ borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 22, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)', flex: 'none' }}>{nf(paged.offset + i + 1)}</span>
              <div style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5 }}>
                {(u.display_name || u.username).slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{u.display_name || u.username}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)' }}>@{u.username}</span>
                  {u.username === me && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: 'var(--ok-soft)', color: 'var(--ok)' }}>คุณ</span>}
                  {!u.active && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: 'var(--danger-soft)', color: 'var(--danger)' }}>ปิดใช้งาน</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                  {ROLE_TH[u.role] ?? u.role} · โรง: {u.hcodes.includes('*') ? 'ทุกโรง' : u.hcodes.join(', ') || '—'}
                  <span style={{ color: 'var(--text-faint)' }}> · เข้าระบบล่าสุด: {u.last_login_at ? new Date(u.last_login_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'ยังไม่เคย'}</span>
                </div>
              </div>
              {u.role !== 'superadmin' && (
                <button onClick={() => setEditing(editing === u.username ? null : u.username)} style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border)', background: editing === u.username ? 'var(--accent-soft)' : 'var(--surface)', color: editing === u.username ? 'var(--accent-strong)' : 'var(--text-dim)', cursor: 'pointer' }}>
                  {editing === u.username ? 'ปิด' : 'สิทธิ์'}
                </button>
              )}
              <button onClick={() => resetPassword(u)} disabled={busy} style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>รีเซ็ตรหัส</button>
              {u.username !== me && (
                <>
                  <button onClick={() => patch(u.username, { active: !u.active })} disabled={busy} style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: u.active ? 'var(--warn)' : 'var(--ok)', cursor: 'pointer' }}>
                    {u.active ? 'พักใช้' : 'เปิดใช้'}
                  </button>
                  <button onClick={() => remove(u)} disabled={busy} style={{ fontSize: 11.5, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer' }}>ลบ</button>
                </>
              )}
            </div>

            {editing === u.username && (
              <div style={{ padding: '2px 20px 18px 66px' }}>
                {/* ขอบเขตโรง — ค่าเริ่มต้นของบัญชีส่วนกลางคือทุกโรง จำกัดทีหลังได้ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>โรงพยาบาลที่ดูได้</span>
                  <Info size={13} text={u.role === 'superadmin' || u.role === 'bmsadmin'
                    ? 'บัญชีส่วนกลางเริ่มต้นเห็นทุกโรง — เลือกเฉพาะบางโรคได้ถ้าต้องการจำกัด (ล้างจนหมด = กลับไปทุกโรค)'
                    : 'บัญชีของโรง เห็นเฉพาะโรงที่เลือกไว้เท่านั้น'} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                  <button onClick={() => patch(u.username, { hcodes: ['*'] })}
                    disabled={busy || u.hcodes.includes('*')} style={{
                      fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 16, cursor: u.hcodes.includes('*') ? 'default' : 'pointer', fontFamily: 'var(--sans)',
                      border: `1px solid ${u.hcodes.includes('*') ? 'var(--accent)' : 'var(--border)'}`,
                      background: u.hcodes.includes('*') ? 'var(--accent-soft)' : 'var(--surface)',
                      color: u.hcodes.includes('*') ? 'var(--accent-strong)' : 'var(--text-faint)',
                    }}>{u.hcodes.includes('*') ? '✓ ' : ''}ทุกโรงพยาบาล</button>
                  {!u.hcodes.includes('*') && u.hcodes.map((h) => (
                    <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, padding: '5px 8px 5px 11px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {hospName(h)} <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>{h}</span>
                      <button onClick={() => patch(u.username, { hcodes: u.hcodes.filter((x) => x !== h) })} disabled={busy} title="เอาโรงนี้ออก"
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  <span style={{ minWidth: 210 }}>
                    <SearchSelect
                      allowCustom
                      onChange={(v) => patch(u.username, { hcodes: [...u.hcodes.filter((x) => x !== '*' && x !== v), v] })}
                      options={hospOpts}
                      onSearch={searchHospitals}
                      placeholder={u.hcodes.includes('*') ? 'จำกัดเฉพาะบางโรง…' : 'เพิ่มโรง…'}
                    />
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>สิทธิ์การเข้าถึง</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>เลือกกลุ่มเมนูที่บัญชีนี้เปิดใช้ได้</span>
                  {u.tabs !== null && (
                    <button onClick={() => patch(u.username, { clear_tabs: true })} disabled={busy} title="ล้างที่ตั้งเอง กลับไปใช้ค่ามาตรฐานของบทบาทนี้"
                      style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                      Reset to role default
                    </button>
                  )}
                </div>
                {(() => {
                  const mine = data?.role_tabs?.[u.role] ?? data?.all_tabs ?? []
                  const plain = mine.filter((t) => !TAB_INFO[t]?.danger)
                  const risky = mine.filter((t) => TAB_INFO[t]?.danger)
                  const cards = (list: string[]) => (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(210px, 100%), 1fr))', gap: 8 }}>
                      {list.map((t) => (
                        <PermCard key={t} tab={t} on={u.effective_tabs.includes(t)} busy={busy} onClick={() => toggleTab(u, t)} />
                      ))}
                    </div>
                  )
                  return (
                    <>
                      {cards(plain)}
                      {risky.length > 0 && (
                        // สิทธิ์ที่แก้ข้อมูลระดับระบบได้ — แยกกลุ่มให้เห็นชัดว่าคนละชั้นกับด้านบน
                        <div style={{ marginTop: 14, paddingLeft: 12, borderLeft: '2px solid var(--warn)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Icon name="alert" size={13} color="var(--warn)" width={2} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>Advanced</span>
                          </div>
                          {cards(risky)}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        ))}
        {data && shown.length === 0 && <div style={{ padding: '18px 20px', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', borderTop: '1px solid var(--border)' }}>{q || hf ? 'ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข' : 'ยังไม่มีผู้ใช้'}</div>}
        {!data && !err && <Loading />}
      </div>
    </div>

    {/* popup เพิ่มผู้ใช้ */}
    {showNew && (
      <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>เพิ่มผู้ใช้</span>
            <button onClick={() => setShowNew(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 5 }}>Role
              {/* role user สร้างจากหน้านี้ไม่ได้ (พนักงานโรง login ผ่านบัญชี HOSxP เอง) */}
              <select className="nice-select" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
                {(data?.roles ?? []).filter((r) => r !== 'user').map((r) => <option key={r} value={r}>{ROLE_TH[r] ?? r}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 5 }}>อีเมล (ใช้เป็นชื่อผู้ใช้ login)
              <input value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} type="email" placeholder="เช่น somchai@hospital.go.th" style={{
                ...field,
                ...(nu.username.trim() && !EMAIL_RE.test(nu.username.trim().toLowerCase()) ? { borderColor: 'var(--danger)' } : {}),
              }} />
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 5 }}>รหัสผ่าน (ระบบสุ่มให้ 6 ตัว)
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} style={{ ...field, flex: 1, fontFamily: 'var(--mono)', letterSpacing: '1px' }} />
                <button type="button" onClick={() => setNu({ ...nu, password: genPassword() })} title="สุ่มรหัสใหม่"
                  style={{ fontSize: 12, fontWeight: 600, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>สุ่มใหม่</button>
              </div>
            </label>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 5 }}>ชื่อที่แสดง
              <input value={nu.display_name} onChange={(e) => setNu({ ...nu, display_name: e.target.value })} placeholder="เช่น คุณสมชาย (ไอที)" style={field} />
            </label>
            {nu.role !== 'superadmin' && nu.role !== 'bmsadmin' && (
              <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 5 }}>โรงพยาบาลที่ดูแล (เลือกได้หลายโรง)
                <SearchSelect
                  multi allowCustom
                  values={nu.hcodes}
                  onToggle={(v) => setNu((s) => ({ ...s, hcodes: s.hcodes.includes(v) ? s.hcodes.filter((x) => x !== v) : [...s.hcodes, v] }))}
                  options={hospOpts}
                  onSearch={searchHospitals}
                  placeholder="พิมพ์เลขหรือชื่อโรงพยาบาลเพื่อค้นหา…"
                />
              </label>
            )}
            {err && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>ผิดพลาด: {err}</div>}
          </div>
          <div style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowNew(false)} style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>ยกเลิก</button>
            <button onClick={create} disabled={busy || !nu.username.trim() || nu.password.trim().length < 6 || ((nu.role === 'admin' || nu.role === 'user') && nu.hcodes.length === 0)}
              style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 18px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>
              {busy ? 'กำลังสร้าง…' : 'สร้างบัญชี'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* popup หลังสร้างสำเร็จ — รหัสผ่านโชว์ครั้งเดียว ให้ copy ส่งผู้ใช้ */}
    {created && (
      <div onClick={() => setCreated(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14.5, color: 'var(--ok)' }}>✓ {created.reset ? 'รีเซ็ตรหัสผ่านแล้ว' : 'สร้างบัญชีแล้ว'}</div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>อีเมล</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9 }}>{created.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>รหัสผ่าน</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 700, letterSpacing: '2px', padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9 }}>{created.password}</div>
            <div style={{ fontSize: 11.5, color: 'var(--warn)' }}>รหัสผ่านแสดงครั้งเดียว — คัดลอกส่งให้ผู้ใช้เก็บไว้ก่อนปิดหน้าต่างนี้</div>
          </div>
          <div style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => { navigator.clipboard?.writeText(`${created.username}\n${created.password}`).then(() => setCopied(true)).catch(() => {}) }}
              style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: copied ? 'var(--ok-soft)' : 'var(--surface)', color: copied ? 'var(--ok)' : 'var(--text-dim)', cursor: 'pointer' }}>
              {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกอีเมล + รหัส'}
            </button>
            <button onClick={() => setCreated(null)} style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 18px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>ปิด</button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
