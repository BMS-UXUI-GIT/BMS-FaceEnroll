import { useEffect, useRef, useState } from 'react'
import { Loading } from '../components/Spinner'
import { api } from '../api'
import { PickHospital } from '../components/PickHospital'
import { useApp } from '../state'

// ตั้งค่ารายโรง — ส่งลงแอปตอนเข้าสู่ระบบ พนักงานปิดเองไม่ได้
// super แก้ได้ทุกโรง (เลือกจากแถบบน) · admin แก้โรงตัวเอง · user ดูอย่างเดียว

type Pol = Record<string, any>

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }
const rowSt: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderTop: '1px solid var(--border)', minHeight: 58 }
const numInput: React.CSSProperties = { width: 96, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13.5, outline: 'none', textAlign: 'right' }
const textInput: React.CSSProperties = { ...numInput, width: 240, fontFamily: 'var(--sans)', textAlign: 'left' }

const LIVENESS_TYPES = ['random', 'blink', 'smile', 'left', 'right']
const LIVENESS_LABELS: Record<string, string> = { random: 'สุ่ม', blink: 'กระพริบตา', smile: 'ยิ้ม', left: 'หันซ้าย', right: 'หันขวา' }

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 40, height: 22, borderRadius: 20, border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative', flex: 'none',
      background: on ? 'var(--ok)' : 'var(--surface-3)', transition: 'background .15s', opacity: disabled ? 0.6 : 1,
    }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} />
    </button>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={rowSt}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

// ช่องตัวเลข/ข้อความ — บันทึกตอน blur หรือกด Enter
function NumField({ value, min, max, step, disabled, onCommit }: { value: number; min: number; max: number; step?: number; disabled?: boolean; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  useEffect(() => { setV(String(value)) }, [value])
  const commit = () => {
    const n = Math.max(min, Math.min(max, Number(v)))
    if (Number.isNaN(n)) { setV(String(value)); return }
    if (n !== value) onCommit(n)
    setV(String(n))
  }
  return <input type="number" value={v} min={min} max={max} step={step} disabled={disabled} onChange={(e) => setV(e.target.value)}
    onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={numInput} />
}

function TextField({ value, placeholder, disabled, onCommit }: { value: string; placeholder?: string; disabled?: boolean; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])
  const commit = () => { if (v.trim() !== value) onCommit(v.trim()) }
  return <input value={v} placeholder={placeholder} disabled={disabled} onChange={(e) => setV(e.target.value)}
    onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={textInput} />
}

function Section({ title, sub, icon, children }: { title: string; sub?: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ padding: '15px 20px 13px', display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface-2)' }}>
        {icon && (
          <div style={{ width: 32, height: 32, flex: 'none', borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icon}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

// การ์ดช่องทางแจ้งเตือน 1 ช่องทาง — เปิด/ปิดแยกกัน · เปิดแล้วโชว์ช่องตั้งค่าของช่องทางนั้น
// เพิ่มช่องทางใหม่ในอนาคต = วาง <NotiChannel> อีกก้อน
function NotiChannel({ icon, name, desc, on, onToggle, disabled, onHelp, children }: {
  icon: string; name: string; desc?: string; on: boolean; onToggle: () => void
  disabled?: boolean; onHelp?: () => void; children?: React.ReactNode
}) {
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', minHeight: 58 }}>
        <span style={{ fontSize: 20, flex: 'none', width: 26, textAlign: 'center' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
          {desc && <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{desc}</div>}
        </div>
        {onHelp && (
          <button onClick={onHelp} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', cursor: 'pointer', whiteSpace: 'nowrap' }}>📖 คู่มือ</button>
        )}
        <Toggle on={on} disabled={disabled} onClick={onToggle} />
      </div>
      {on && children && (
        <div style={{ padding: '4px 20px 16px 58px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// แถวตั้งค่าย่อยในช่องทาง (label ซ้าย + input ขวา)
function CfgRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 130 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

export function Settings() {
  const { currentHcode, session, setNav } = useApp()
  const readOnly = session?.role === 'user'
  const [pol, setPol] = useState<Pol | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const seqRef = useRef(0)

  useEffect(() => {
    if (currentHcode === '*') return
    let alive = true // กันสลับโรงแล้ว response โรงเก่ามาทับ (จะอ่าน/เขียนผิดโรง)
    seqRef.current++ // ตัด save ที่ค้างของโรงเก่าด้วย
    setPol(null); setErr(null)
    api.get<{ policy: Pol }>(`/admin/policy?hcode=${encodeURIComponent(currentHcode)}`)
      .then((d) => alive && setPol(d.policy)).catch((e) => alive && setErr(e?.message || 'โหลดไม่สำเร็จ'))
    return () => { alive = false }
  }, [currentHcode])

  const updMany = async (patch: Record<string, any>) => {
    if (!pol || readOnly) return
    const prev = pol
    const my = ++seqRef.current // รับเฉพาะ response ล่าสุด (กันกดติดกันแล้วอันเก่ามาทับ)
    setPol({ ...pol, ...patch }) // อัปเดตหน้าจอทันที ไม่ต้องรอ
    setErr(null)
    try {
      const d = await api.post<{ policy: Pol }>(`/admin/policy/${currentHcode}`, patch)
      if (my !== seqRef.current) return
      setPol(d.policy)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e: any) {
      if (my !== seqRef.current) return
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
      // ดึงค่าจริงจาก server แทนการเดา rollback (กัน save ซ้อนกันแล้ว state ค้างผิด)
      try {
        const d = await api.get<{ policy: Pol }>(`/admin/policy?hcode=${encodeURIComponent(currentHcode)}`)
        if (my === seqRef.current) setPol(d.policy)
      } catch { if (my === seqRef.current) setPol(prev) }
    }
  }
  const upd = (k: string, v: any) => updMany({ [k]: v })

  if (currentHcode === '*') return <PickHospital />

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
          ตั้งค่าของโรง {currentHcode} · แอปรับค่าล่าสุดเองเมื่อพนักงานเปิดแอป · พนักงานแก้เองไม่ได้
          {readOnly && <span style={{ color: 'var(--warn)' }}> · ดูอย่างเดียว (User)</span>}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)', opacity: saved ? 1 : 0, transition: 'opacity .25s' }}>บันทึกแล้ว ✓</span>
      </div>
      {err && <div style={{ ...card, padding: '12px 20px', color: 'var(--danger)', fontSize: 13 }}>ผิดพลาด: {err}</div>}
      {!pol && !err && <div style={card}><Loading /></div>}

      {pol && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
          <Section title="ตรวจว่าเป็นคนจริง" sub="กันปลอมด้วยรูปถ่าย/วิดีโอ (แนะนำเปิดใช้งานจริง)" icon="🛡️">
            <Row label="เปิดใช้งาน"><Toggle on={pol.liveness_enabled} disabled={readOnly} onClick={() => upd('liveness_enabled', !pol.liveness_enabled)} /></Row>
            <Row label="จำนวนท่าที่ต้องทำ" sub="1–5"><NumField value={pol.liveness_count} min={1} max={5} disabled={readOnly} onCommit={(v) => upd('liveness_count', v)} /></Row>
            <Row label="ท่าที่ให้ทำ">
              <select className="nice-select" value={pol.liveness_type} disabled={readOnly} onChange={(e) => upd('liveness_type', e.target.value)} style={{ width: 130 }}>
                {LIVENESS_TYPES.map((t) => <option key={t} value={t}>{LIVENESS_LABELS[t] ?? t}</option>)}
              </select>
            </Row>
            <Row label="องศาหันซ้าย/ขวา" sub="ต้องหันเกินกี่องศาถึงนับ"><NumField value={pol.liveness_yaw_deg} min={5} max={45} disabled={readOnly} onCommit={(v) => upd('liveness_yaw_deg', v)} /></Row>
            <Row label="องศาเงยหน้า"><NumField value={pol.liveness_pitch_deg} min={5} max={30} disabled={readOnly} onCommit={(v) => upd('liveness_pitch_deg', v)} /></Row>
            <Row label="เกณฑ์กระพริบตา" sub="0.1–1.0 ยิ่งสูงยิ่งเข้มงวด"><NumField value={pol.liveness_eye_open} min={0.1} max={1} step={0.05} disabled={readOnly} onCommit={(v) => upd('liveness_eye_open', v)} /></Row>
            <Row label="เกณฑ์ยิ้ม" sub="0.1–1.0"><NumField value={pol.liveness_smile} min={0.1} max={1} step={0.05} disabled={readOnly} onCommit={(v) => upd('liveness_smile', v)} /></Row>
          </Section>

          <Section title="การยืนยันตอนลงเวลา" sub="ขั้นตอนก่อนบันทึกเวลา" icon="✅">
            <Row label="ยิ้มเพื่อยืนยัน" sub="เปิดแล้วปุ่มยืนยันจะถูกซ่อน — ยิ้มเท่านั้นถึงบันทึก"><Toggle on={pol.smile_confirm} disabled={readOnly} onClick={() => upd('smile_confirm', !pol.smile_confirm)} /></Row>
            <Row label="หน้าต่างยืนยัน" sub="เลือกเข้า/ออก + เวร ก่อนบันทึก"><Toggle on={pol.confirm_popup} disabled={readOnly} onClick={() => upd('confirm_popup', !pol.confirm_popup)} /></Row>
            <Row label="ความใกล้ตอนสแกน (%)" sub="ยิ่ง % สูง ยิ่งต้องเอาหน้าเข้าใกล้กล้องถึงจะเริ่มสแกน · ตัวเลขน้อย = ยืนไกลก็สแกนติด (เสี่ยงติดหน้าคนเดินผ่าน) — แนะนำ 30-50"><NumField value={pol.min_face_width} min={10} max={90} disabled={readOnly} onCommit={(v) => upd('min_face_width', v)} /></Row>
          </Section>

          <Section title="แจ้งเตือน" sub="เด้งแจ้งเมื่อลงเวลาสำเร็จ — เปิดพร้อมกันได้หลายช่องทาง" icon="🔔">
            {/* BMS Noti (เดิม) */}
            <NotiChannel icon="🟦" name="BMS Noti" desc="ระบบแจ้งเตือนของ BMS"
              on={pol.bms_noti} disabled={readOnly} onToggle={() => upd('bms_noti', !pol.bms_noti)}>
              <CfgRow label="Token" sub="ของโรงนี้">
                <TextField value={pol.noti_token} placeholder="วาง token ที่นี่" disabled={readOnly} onCommit={(v) => upd('noti_token', v)} />
              </CfgRow>
            </NotiChannel>

            {/* Telegram (ส่งเข้ากลุ่ม) */}
            <NotiChannel icon="✈️" name="Telegram" desc="ส่งข้อความเข้ากลุ่ม Telegram"
              on={pol.telegram_noti} disabled={readOnly} onToggle={() => upd('telegram_noti', !pol.telegram_noti)}
              onHelp={() => setNav('help')}>
              <CfgRow label="Bot Token" sub="จาก @BotFather">
                <TextField value={pol.telegram_bot_token} placeholder="เช่น 123456789:AAE-..." disabled={readOnly} onCommit={(v) => upd('telegram_bot_token', v)} />
              </CfgRow>
              <CfgRow label="Chat ID" sub="ของกลุ่ม (ขึ้นต้นด้วย -100)">
                <TextField value={pol.telegram_chat_id} placeholder="เช่น -1001234567890" disabled={readOnly} onCommit={(v) => upd('telegram_chat_id', v)} />
              </CfgRow>
            </NotiChannel>
          </Section>
        </div>
      )}
    </div>
  )
}
