import { useEffect, useRef, useState } from 'react'
import { useScreenZoom } from '../hooks'
import { Icon } from '../icons'
import { useApp } from '../state'

// ฟอร์มลงทะเบียนโรงพยาบาล (public) — ดีไซน์ FaceCheck: ซ้ายแนะนำระบบ / ขวาฟอร์ม
// ยื่นแล้วเข้าคิว "รออนุมัติ" ในจัดการระบบของ super

const BASE = window.__API_BASE__ || (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8300'

type Hosp = { hcode: string; name: string }

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }
const field: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 11,
  background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5, outline: 'none',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 7 }
const req = <span style={{ color: 'var(--danger)' }}> *</span>

// ไอคอนเส้นเล็กๆ เฉพาะหน้านี้ (ตามดีไซน์)
function Svg({ d, size = 16, sw = 1.9, style }: { d: string[]; size?: number; sw?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}
const CHECK = ['M20 6 9 17l-5-5']

const FEATURES = [
  { title: 'สแกนใบหน้า + liveness', sub: 'ยืนยันตัวตนด้วยใบหน้า ตรวจว่าเป็นคนจริง กันภาพ/วิดีโอปลอม', d: ['M3 7V5a2 2 0 0 1 2-2h2', 'M17 3h2a2 2 0 0 1 2 2v2', 'M21 17v2a2 2 0 0 1-2 2h-2', 'M7 21H5a2 2 0 0 1-2-2v-2', 'M9 10h.01', 'M15 10h.01', 'M9.5 14a3.5 3.5 0 0 0 5 0'] },
  { title: 'ลงเวลาเข้า–ออกเวร', sub: 'บันทึกเวลาเข้า/ออกลงระบบ HOSxP ของโรงอัตโนมัติ', d: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v4l3 2'] },
  { title: 'GPS จำกัดพื้นที่', sub: 'ลงเวลาได้เฉพาะในรัศมีจุดที่กำหนด กันลงเวลานอกที่', d: ['M12 22s8-4 8-10a8 8 0 1 0-16 0c0 6 8 10 8 10z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'] },
  { title: 'มีระบบ dashboard และรายงาน', sub: 'สรุปรายวัน–รายเดือน ตรวจความผิดปกติ', d: ['M3 3v18h18', 'M7 14l3-3 3 3 5-6'] },
  { title: 'มอนิเตอร์ + ครอบคลุมลงทะเบียน', sub: 'เห็นการเข้าเวรสด และรู้ว่าใครยังไม่ลงทะเบียนใบหน้า', d: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'] },
  { title: 'รองรับ PDPA', sub: 'เก็บเป็น face template ลบใบหน้าได้ พร้อม audit log', d: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 11.5l2 2 4-4'] },
]
const PREVIEW_KPIS = [
  { label: 'ลงเวลาวันนี้', value: '312', dot: 'var(--ok)', color: 'var(--text)' },
  { label: 'ครบเข้า-ออกเวร', value: '287', dot: 'var(--info)', color: 'var(--text)' },
  { label: 'สาย', value: '9', dot: 'var(--warn)', color: 'var(--warn)' },
  { label: 'ออกก่อนเวลา', value: '3', dot: 'var(--warn)', color: 'var(--text)' },
  { label: 'นอกพื้นที่', value: '2', dot: 'var(--danger)', color: 'var(--text)' },
  { label: 'สแกนแต่ไม่ลงเวลา', value: '1', dot: 'var(--danger)', color: 'var(--danger)' },
]
const MINI_REPORT = [
  { name: 'สมชาย ใจดี', time: '11:25', tag: 'ลืมออก' },
  { name: 'สมหญิง รักงาน', time: '09:33', tag: 'สาย' },
  { name: 'สมศักดิ์ ตรงเวลา', time: '16:49', tag: 'สาย' },
]
const STEPS = [
  { n: '1', title: 'ตรวจสอบคำขอ', sub: 'เจ้าหน้าที่ยืนยันหน่วยงานและสิทธิ์' },
  { n: '2', title: 'สมัครบัญชีให้', sub: 'เจ้าหน้าที่สร้างบัญชีผู้ใช้แล้วส่งให้ทางอีเมล' },
  { n: '3', title: 'เริ่มลงทะเบียนใบหน้า', sub: 'พนักงานถ่ายใบหน้าผ่านแอปแล้วเริ่มใช้งาน' },
]

// รูปแบบผู้ติดต่อ — ใช้ทั้งเช็คสดใต้ช่อง (พิมพ์แล้วรู้เลย) และตอนกดส่ง
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const phoneOk = (v: string) => /^[0-9+\-() ]{8,20}$/.test(v.trim()) && v.replace(/\D/g, '').length >= 8

function FieldError({ show, text }: { show: boolean; text: string }) {
  if (!show) return null
  return <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 5 }}>{text}</div>
}

// ค้นไม่เจอ/ระบบล่ม → กรอกรหัสหน่วยงานเองได้ ถ้าเป็นตัวเลข 4–6 หลัก
function UseCodeBtn({ q, onPick }: { q: string; onPick: (h: Hosp) => void }) {
  if (!/^\d{4,6}$/.test(q.trim())) return null
  return (
    <button onClick={() => onPick({ hcode: q.trim(), name: '' })} style={{ marginTop: 9, fontSize: 12.5, fontWeight: 600, padding: '8px 12px', borderRadius: 9, border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-strong)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
      ใช้รหัสหน่วยงาน “{q.trim()}” นี้
    </button>
  )
}

const PDPA_DATA_ITEMS = [
  { title: 'ข้อมูลชีวมิติใบหน้า (face template)', sub: 'ค่าทางคณิตศาสตร์ที่ได้จากใบหน้า ใช้เทียบยืนยันตัวตน' },
  { title: 'ข้อมูลระบุตัวตน', sub: 'รหัสพนักงาน (emp_id), ชื่อ-สกุล, หน่วยงาน (hcode)' },
  { title: 'ข้อมูลการเข้าเวร', sub: 'วันเวลาเข้า–ออก, เวร (บันทึกใน HOSxP ของหน่วยงาน)' },
  { title: 'ตำแหน่งที่ตั้ง (GPS)', sub: 'พิกัดขณะลงเวลา เพื่อยืนยันการอยู่ในพื้นที่ (หากเปิดใช้)' },
]
const PDPA_RIGHTS = [
  'ขอเข้าถึงและขอสำเนาข้อมูลของท่าน', 'ขอแก้ไขข้อมูลให้ถูกต้องเป็นปัจจุบัน',
  'ขอลบใบหน้า/ถอนความยินยอมได้ทุกเมื่อ', 'ขอระงับการใช้ข้อมูลชั่วคราว',
  'ขอคัดค้านการประมวลผล', 'ขอให้โอนย้ายข้อมูล (portability)',
]

function PdpaSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{n}</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </section>
  )
}

// นโยบายความเป็นส่วนตัว (popup) — เนื้อหาตามดีไซน์ PDPA
function PdpaModal({ onClose }: { onClose: () => void }) {
  const dim: React.CSSProperties = { margin: 0, color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.65 }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent-strong)', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
              <Svg d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} size={12} sw={2} />PDPA · พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-.3px' }}>นโยบายความเป็นส่วนตัว</h2>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>ปรับปรุงล่าสุด: 7 กรกฎาคม 2569 · เวอร์ชัน 1.0</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20, lineHeight: 1, flex: 'none' }}>×</button>
        </div>

        <div className="reg-scroll" style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <PdpaSection n="01" title="ผู้ควบคุมข้อมูลส่วนบุคคล">
            <p style={dim}>โรงพยาบาล/หน่วยงานต้นสังกัดของท่านเป็น <b>ผู้ควบคุมข้อมูล</b> (Data Controller) และ FaceCheck ทำหน้าที่เป็น <b>ผู้ประมวลผลข้อมูล</b> (Data Processor) ตามคำสั่งของหน่วยงาน โดยระบบเป็นเพียง gateway และ<b>ไม่ได้เก็บข้อมูลเวลาเข้าเวรไว้เอง</b> — ข้อมูลเวลาจริงอยู่ในระบบ HOSxP ของแต่ละโรงพยาบาล</p>
          </PdpaSection>

          <PdpaSection n="02" title="ข้อมูลที่เราเก็บ">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PDPA_DATA_ITEMS.map((d) => (
                <div key={d.title} style={{ padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 11, background: 'var(--surface-2)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{d.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>{d.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, padding: '12px 14px', border: '1px solid var(--warn)', borderRadius: 11, background: 'var(--warn-soft)' }}>
              <span style={{ color: 'var(--warn)', flex: 'none', marginTop: 1 }}><Svg d={['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4M12 17h.01']} size={17} sw={2} /></span>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}><b style={{ color: 'var(--text)' }}>ข้อมูลใบหน้าเป็นข้อมูลอ่อนไหว</b> — ระบบเก็บเป็น <b>ค่าทางคณิตศาสตร์ (face template)</b> ที่ไม่สามารถแปลงกลับเป็นรูปถ่ายได้ ไม่ใช่ภาพถ่ายดิบ และประมวลผลภายใต้ความยินยอมโดยชัดแจ้ง</div>
            </div>
          </PdpaSection>

          <PdpaSection n="03" title="วัตถุประสงค์และฐานทางกฎหมาย">
            <ul style={{ ...dim, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>ยืนยันตัวตนพนักงานเพื่อ<b>บันทึกเวลาเข้าเวร–ออกเวร</b>ลงระบบ HOSxP ของหน่วยงาน</li>
              <li>ตรวจสอบความถูกต้องของการลงเวลา (สาย/ขาด/ควบเวร) และป้องกันการลงเวลาแทนกัน</li>
              <li>จัดทำรายงานและมอนิเตอร์การใช้งานสำหรับผู้ดูแลระบบของหน่วยงาน</li>
            </ul>
            <p style={{ ...dim, marginTop: 10 }}><b>ฐานทางกฎหมาย:</b> ความยินยอมโดยชัดแจ้ง (Explicit Consent) สำหรับข้อมูลชีวมิติ ประกอบกับความจำเป็นตามสัญญาจ้างและภารกิจของหน่วยงานรัฐ</p>
          </PdpaSection>

          <PdpaSection n="04" title="ระยะเวลาการเก็บรักษา">
            <p style={dim}>เก็บ face template ตลอดระยะเวลาที่ท่านยังเป็นพนักงานที่ใช้งานระบบ เมื่อพ้นสภาพหรือถอนความยินยอม ระบบจะ<b>ลบ template และภาพใบหน้าอย่างถาวร</b> ส่วนบันทึกการสแกนจะถูกเก็บเป็น <b>audit log</b> ตามระยะเวลาที่กฎหมาย/หน่วยงานกำหนด โดยไม่มีข้อมูลชีวมิติ</p>
          </PdpaSection>

          <PdpaSection n="05" title="การเปิดเผยข้อมูล">
            <p style={dim}>เราไม่ขาย ไม่แลกเปลี่ยน และไม่เปิดเผยข้อมูลชีวมิติต่อบุคคลภายนอกเพื่อการตลาด ข้อมูลถูกใช้เฉพาะภายในหน่วยงานต้นสังกัด และเปิดเผยต่อหน่วยงานราชการเฉพาะเมื่อมีคำสั่งตามกฎหมายเท่านั้น</p>
          </PdpaSection>

          <PdpaSection n="06" title="สิทธิของเจ้าของข้อมูล">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 8 }}>
              {PDPA_RIGHTS.map((r) => (
                <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <span style={{ color: 'var(--ok)', display: 'flex', marginTop: 1 }}><Svg d={CHECK} size={14} sw={2.4} /></span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{r}</span>
                </div>
              ))}
            </div>
          </PdpaSection>

          <PdpaSection n="07" title="มาตรการรักษาความปลอดภัย">
            <ul style={{ ...dim, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>เข้ารหัสข้อมูลระหว่างส่ง (TLS) และจัดเก็บ face template แบบเข้ารหัส</li>
              <li>ควบคุมการเข้าถึงตามบทบาท และบันทึก audit ทุกการเปลี่ยนแปลง</li>
              <li>ตรวจใบหน้าจริง (liveness detection) ป้องกันการปลอมด้วยภาพหรือวิดีโอ</li>
            </ul>
          </PdpaSection>

        </div>

        <div style={{ padding: '13px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>เข้าใจแล้ว</button>
        </div>
      </div>
    </div>
  )
}

// จอตัวอย่างฝั่งซ้าย (mock ประกอบการขาย — ไม่ใช่ข้อมูลจริง)
function BrowserBar({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
      {['#e5654a', '#e6b23c', '#3fb463'].map((c) => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
      <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text-faint)', marginLeft: 6 }}>{label}</span>
    </div>
  )
}

// ชุดการ์ดตัวอย่าง — เรนเดอร์ 2 ชุดต่อกันให้ marquee วนแบบไร้รอยต่อ
function PreviewSet({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flex: 'none' }}>
      {/* dashboard */}
      <div style={{ flex: 'none', width: 340, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        <BrowserBar label="face-check.bmscloud.in.th" />
        <div style={{ padding: '15px 15px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text-faint)' }}>มอนิเตอร์</div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.2px' }}>Dashboard</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>สำนักงานทดสอบ · 99999</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {PREVIEW_KPIS.map((k) => (
              <div key={k.label} style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '9px 10px', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 500 }}>{k.label}</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: k.dot }} />
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--mono)', color: k.color, marginTop: 4, lineHeight: 1 }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* มือถือ */}
      <div style={{ width: 158, flex: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-md)', padding: 9 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 17, overflow: 'hidden', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '7px 0 4px' }}><span style={{ width: 38, height: 4, borderRadius: 3, background: 'var(--border-strong)' }} /></div>
          <div style={{ padding: '8px 12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginBottom: 12 }}>แอปพนักงาน · ลงเวลาเข้า</div>
            <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 12px' }}>
              <div className="spin" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px dashed var(--accent)', opacity: .5, animationDuration: '8s' }} />
              <div style={{ position: 'absolute', inset: 11, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-strong)' }}>
                <Svg d={['M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M5.5 20a6.5 6.5 0 0 1 13 0']} size={40} sw={1.6} />
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--ok)', background: 'var(--ok-soft)', padding: '3px 9px', borderRadius: 20 }}>
              <Svg d={CHECK} size={12} sw={3} />ยืนยันตัวตนสำเร็จ
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 8 }}>match 0.94 · 07:58 น.</div>
          </div>
        </div>
      </div>

      {/* รายงานผิดปกติ */}
      <div style={{ flex: 'none', width: 270, alignSelf: 'stretch', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        <BrowserBar label="ลงเวลา · รายงานผิดปกติ" />
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MINI_REPORT.map((r) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)' }}>{r.time}</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 7px', borderRadius: 20, color: 'var(--warn)', background: 'var(--warn-soft)', whiteSpace: 'nowrap' }}>{r.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* จุดลงเวลา map */}
      <div style={{ flex: 'none', width: 240, alignSelf: 'stretch', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        <BrowserBar label="จุดลงเวลา · GPS" />
        <div style={{ position: 'relative', height: '100%', minHeight: 130, background: 'repeating-linear-gradient(0deg,var(--surface-2),var(--surface-2) 22px,var(--surface-3) 22px,var(--surface-3) 23px),repeating-linear-gradient(90deg,var(--surface-2),var(--surface-2) 22px,var(--surface-3) 22px,var(--surface-3) 23px)' }}>
          <div style={{ position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%,-50%)', width: 80, height: 80, borderRadius: '50%', background: 'rgba(91,83,224,.15)', border: '1px solid rgba(91,83,224,.4)' }} />
          <div style={{ position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%,-100%)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#dc2f2f" stroke="#fff" strokeWidth="1.5"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" fill="#fff" stroke="none" /></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ตัวอย่างหน้าจอ — เลื่อนวนลูปอัตโนมัติ (ชี้เมาส์ = หยุดให้อ่าน)
function Previews() {
  return (
    <div className="reg-marquee" style={{
      overflow: 'hidden', paddingBottom: 4,
      WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
      maskImage: 'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
    }}>
      <div className="reg-marquee-track" style={{ display: 'flex', gap: 16, width: 'max-content' }}>
        <PreviewSet />
        <PreviewSet hidden />
      </div>
    </div>
  )
}

export function HospitalRequest() {
  const { theme, toggleTheme, loginDemo } = useApp()
  const zoom = useScreenZoom()
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoErr, setDemoErr] = useState<string | null>(null)

  // เข้าดู dashboard โรงพยาบาลตัวอย่าง (อ่านอย่างเดียว) — ออกจากหน้า /hospital-request
  const openDemo = async () => {
    setDemoErr(null)
    setDemoBusy(true)
    try {
      await loginDemo()
      // BASE_URL = '/' บน server จริง, '/<repo>/' บนเว็บ demo (GitHub Pages)
      window.location.assign(import.meta.env.BASE_URL)
    } catch (e) {
      setDemoErr(e instanceof Error ? e.message : 'เปิดตัวอย่างไม่สำเร็จ')
      setDemoBusy(false)
    }
  }
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Hosp[]>([])
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const [picked, setPicked] = useState<Hosp | null>(null)
  const [type, setType] = useState<'demo' | 'real'>('demo')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [showPdpa, setShowPdpa] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [reqId, setReqId] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const seq = useRef(0)

  // ค้นโรงจากทะเบียนกลาง ด้วยเลขหรือชื่อ (debounce)
  useEffect(() => {
    if (picked || q.trim().length < 1) { setResults([]); setLoading(false); return }
    window.clearTimeout(timer.current)
    const my = ++seq.current
    setLoading(true)
    timer.current = window.setTimeout(async () => {
      try {
        const r = await fetch(`${BASE}/hospital-master/search?q=${encodeURIComponent(q.trim())}&limit=20`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (my === seq.current) { setSearchErr(null); setResults(j.hospitals ?? []); setLoading(false) }
      } catch {
        // ระบบมีปัญหา ≠ ค้นไม่เจอ — บอกให้ถูก
        if (my === seq.current) { setSearchErr('ค้นหาไม่ได้ชั่วคราว (ระบบมีปัญหา) ลองใหม่อีกครั้ง'); setResults([]); setLoading(false) }
      }
    }, 300)
    return () => window.clearTimeout(timer.current)
  }, [q, picked])

  const submit = async () => {
    setErr(null)
    if (!picked) return setErr('กรุณาค้นหาและเลือกหน่วยงานของท่าน')
    if (!contactName.trim() || !phone.trim() || !email.trim()) return setErr('กรุณากรอกข้อมูลผู้ติดต่อให้ครบทุกช่อง')
    if (!emailOk(email)) return setErr('รูปแบบอีเมลไม่ถูกต้อง')
    if (!phoneOk(phone)) return setErr('รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวเลข 8 หลักขึ้นไป)')
    setBusy(true)
    try {
      const r = await fetch(`${BASE}/hospital-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hcode: picked.hcode, name: picked.name, request_type: type,
          contact_name: contactName.trim(), contact_phone: phone.trim(), contact_email: email.trim(),
        }),
      })
      // error page อาจไม่ใช่ JSON (เช่น 502 จาก proxy) — parse แบบไม่พัง
      const text = await r.text()
      let j: any = null
      try { j = text ? JSON.parse(text) : null } catch { j = null }
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`)
      // เลขอ้างอิง = วันที่ + รหัสโรง (admin ตามหาคำขอได้จากสองตัวนี้)
      const d = new Date()
      const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      setReqId(`REQ-${ymd}-${picked.hcode}`)
      setDone(true)
    } catch (e: any) { setErr(e?.message || 'ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง') }
    finally { setBusy(false) }
  }

  const reset = () => {
    setDone(false); setReqId(''); setConsent(false); setType('demo')
    setPicked(null); setQ(''); setContactName(''); setPhone(''); setEmail(''); setErr(null)
  }

  return (
    <div style={{ zoom, minHeight: `${100 / zoom}vh`, width: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        .reg-scroll{scrollbar-width:thin;scrollbar-color:var(--border-strong) transparent}
        .reg-scroll::-webkit-scrollbar{height:6px}
        .reg-scroll::-webkit-scrollbar-track{background:transparent}
        .reg-scroll::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:99px}
        .reg-scroll::-webkit-scrollbar-thumb:hover{background:var(--text-faint)}
        /* จอกว้าง: แนะนำระบบซ้าย ฟอร์มขวา (ฟอร์ม sticky) / จอแคบ: ฟอร์มขึ้นก่อนเสมอ */
        .reg-main{display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:40px;align-items:start}
        .reg-form-col{position:sticky;top:20px;min-width:0}
        @media (max-width:1024px){
          .reg-main{grid-template-columns:1fr;gap:30px;justify-items:center}
          .reg-form-col{position:relative;order:-1;width:100%;max-width:560px}
          .reg-intro-col{max-width:560px;width:100%}
        }
        /* ตัวอย่างหน้าจอ: เลื่อนวนลูป (2 ชุดต่อกัน เลื่อนครึ่งเดียว = ไร้รอยต่อ) */
        .reg-marquee-track{animation:regMarquee 45s linear infinite}
        .reg-marquee:hover .reg-marquee-track{animation-play-state:paused}
        @keyframes regMarquee{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 8px))}}
        /* แสงเรืองหลังการ์ดฟอร์ม — จุดเด่นของหน้า */
        .reg-glow{position:absolute;top:-46px;left:-38px;right:-38px;height:min(75%,430px);border-radius:36px;pointer-events:none;filter:blur(16px);background:radial-gradient(60% 60% at 50% 32%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 72%);animation:regBreathe 5.5s ease-in-out infinite}
        @keyframes regBreathe{0%,100%{opacity:.45}50%{opacity:1}}
        /* CTA เข้าดูแดชบอร์ดจริง — ต่อเนื่องจากภาพจำลอง (คลิกทั้งใบ) */
        .reg-demo{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;width:100%;max-width:520px;text-align:left;margin-top:16px;padding:15px 17px;border-radius:16px;cursor:pointer;font-family:var(--sans);color:var(--text);border:1px solid color-mix(in srgb,var(--accent) 34%,var(--border));background:linear-gradient(115deg, var(--accent-soft), color-mix(in srgb, var(--surface) 92%, transparent) 60%);box-shadow:var(--shadow-sm);transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
        .reg-demo::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(115deg, transparent 30%, color-mix(in srgb, var(--accent) 12%, transparent));transition:opacity .18s ease}
        .reg-demo:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);border-color:var(--accent)}
        .reg-demo:hover::after{opacity:1}
        .reg-demo:active{transform:translateY(0)}
        .reg-demo:disabled{cursor:default;opacity:.7;transform:none;box-shadow:var(--shadow-sm)}
        .reg-demo-icon{flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--accent);color:var(--on-accent);box-shadow:0 4px 12px color-mix(in srgb,var(--accent) 40%,transparent)}
        .reg-demo-live{flex:none;display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:800;letter-spacing:.6px;color:var(--ok);background:var(--ok-soft);padding:2px 8px 2px 7px;border-radius:20px}
        .reg-demo-dot{width:6px;height:6px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 70%,transparent);animation:regPing 1.6s ease-out infinite}
        @keyframes regPing{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ok) 70%,transparent)}70%,100%{box-shadow:0 0 0 6px transparent}}
        .reg-demo-go{position:relative;flex:none;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--accent-strong)}
        .reg-demo:hover .reg-demo-arrow{transform:translateX(4px)}
        .reg-demo-arrow{transition:transform .18s ease}
        @media (max-width:440px){.reg-demo-label{display:none}}
        @media (prefers-reduced-motion:reduce){.reg-marquee-track,.reg-glow,.reg-demo-dot{animation:none}.reg-demo:hover{transform:none}}
      `}</style>
      {/* top bar */}
      <header style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1 }}>
          <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <img src="/logo.png" alt="" width={36} height={36} style={{ display: 'block' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>FaceCheck</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>ระบบสแกนหน้า–ลงเวลา สำหรับโรงพยาบาล</div>
          </div>
        </div>
        <button onClick={toggleTheme} title="สลับโหมดสว่าง/มืด" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} width={1.9} />
        </button>
      </header>

      <main className="reg-main" style={{ maxWidth: 1180, margin: '0 auto', padding: '12px clamp(16px, 4vw, 28px) 56px' }}>

        {/* ซ้าย: แนะนำระบบ */}
        <div className="reg-intro-col" style={{ minWidth: 0, paddingTop: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent-strong)', fontSize: 12, fontWeight: 600, marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />สำหรับโรงพยาบาลและหน่วยงานสาธารณสุข
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(16px, 1.8vw, 19px)', lineHeight: 1.4, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '-.2px' }}>ลงเวลาด้วยการสแกนใบหน้า เชื่อมตรงเข้า HOSxP</h1>
          <p style={{ margin: '0 0 26px', fontSize: 13.5, color: 'var(--text-faint)', maxWidth: 480 }}>
            พนักงานสแกนหน้าผ่านแอปบนมือถือ ระบบตรวจใบหน้าจริง (liveness) แล้วบันทึกเวลาเข้า–ออกลง HOSxP อัตโนมัติ พร้อมแดชบอร์ดมอนิเตอร์แบบเรียลไทม์สำหรับผู้ดูแล
          </p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.2px', color: 'var(--text)' }}>ตัวอย่างหน้าจอระบบ</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ภาพประกอบระบบ — เข้าชมระบบจริงได้ที่ด้านล่าง</span>
          </div>
          <Previews />

          {/* เข้าดูแดชบอร์ดจริง (ต่อจากภาพจำลอง) — คลิกทั้งใบ, อ่านอย่างเดียว */}
          <button className="reg-demo" onClick={openDemo} disabled={demoBusy}
            aria-label="เปิดแดชบอร์ดตัวอย่าง (อ่านอย่างเดียว)">
            <span className="reg-demo-icon">
              <Svg d={['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4']} size={22} sw={1.7} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.2px' }}>
                  {demoBusy ? 'กำลังเปิด…' : 'เข้าชมแดชบอร์ดตัวอย่าง'}
                </span>
                <span className="reg-demo-live">
                  <span className="reg-demo-dot" />LIVE
                </span>
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                เข้าถึงได้ทันทีโดยไม่ต้องลงทะเบียน ด้วยข้อมูลจากโรงพยาบาลสาธิต <b style={{ color: 'var(--text-dim)', fontWeight: 700 }}>สำหรับรับชมเท่านั้น ไม่สามารถแก้ไขข้อมูลได้</b>
              </span>
            </span>
            <span className="reg-demo-go">
              <span className="reg-demo-label">เข้าชม</span>
              <span className="reg-demo-arrow" style={{ display: 'inline-block' }}>→</span>
            </span>
          </button>
          {demoErr && (
            <div style={{ marginTop: 8, background: 'color-mix(in srgb, var(--danger) 8%, var(--surface))', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 10, padding: '8px 13px', fontSize: 12.5 }}>{demoErr}</div>
          )}

          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.2px', color: 'var(--text)', marginTop: 26, marginBottom: 2 }}>
            ความสามารถของระบบ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '16px 22px', marginTop: 14, maxWidth: 520 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Svg d={f.d} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 1 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ขวา: ฟอร์ม (sticky บนจอกว้าง / ขึ้นก่อนบนจอแคบ) */}
        <div className="reg-form-col" style={{ alignSelf: 'start' }}>
          <div aria-hidden className="reg-glow" />
          <div style={{ position: 'relative' }}>
          {done ? (
            <div style={{ ...card, borderRadius: 20, border: '1px solid color-mix(in srgb, var(--ok) 40%, var(--border))', boxShadow: 'var(--shadow-lg), 0 0 0 5px var(--ok-soft)', padding: '36px 30px', textAlign: 'center', animation: 'feedIn .3s ease' }}>
              <div style={{ width: 60, height: 60, margin: '0 auto 18px', borderRadius: 16, background: 'var(--ok-soft)', color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Svg d={CHECK} size={30} sw={2.4} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>ส่งคำขอเรียบร้อยแล้ว</h2>
              <p style={{ margin: '0 auto 20px', fontSize: 13.5, color: 'var(--text-dim)', maxWidth: 340 }}>
                คำขอของ <b>{picked?.name || `หน่วยงาน ${picked?.hcode}`}</b> อยู่ระหว่างตรวจสอบ เจ้าหน้าที่จะติดต่อกลับตามเบอร์/อีเมลที่ให้ไว้ — กรุณาบันทึกหมายเลขคำขอไว้อ้างอิง
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>หมายเลขคำขอ</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--accent-strong)' }}>{reqId}</span>
              </div>
              <div>
                <button onClick={reset} style={{ padding: '11px 20px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>ยื่นคำขอใหม่</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{
                ...card, borderRadius: 20, overflow: 'hidden',
                border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))',
                boxShadow: 'var(--shadow-lg), 0 0 0 5px var(--accent-soft)',
              }}>
                {/* แถบสีบนสุด — จุดสังเกตว่านี่คือการ์ดลงทะเบียน */}
                <div style={{ height: 5, background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }} />
                <div style={{ padding: '20px 26px 18px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 20, background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 11.5, fontWeight: 700, letterSpacing: '.3px' }}>
                      <Svg d={['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z']} size={12} sw={2.2} />แบบฟอร์มลงทะเบียน
                    </span>
                  </div>
                  <h2 style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 700, letterSpacing: '-.4px' }}>ลงทะเบียนขอใช้งาน</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>เลือกหน่วยงาน กรอกผู้ติดต่อ แล้วส่งคำขอ</p>
                </div>

                <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 17 }}>
                  {/* หน่วยงาน */}
                  <div>
                    <label style={lbl}>หน่วยงาน / โรงพยาบาลของท่าน{req}</label>
                    {picked ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', border: '1px solid var(--accent)', borderRadius: 11, background: 'var(--accent-soft)' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 700, color: 'var(--accent-strong)' }}>{picked.hcode}</span>
                        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{picked.name || 'กรอกรหัสเอง'}</span>
                        <button onClick={() => { setPicked(null); setQ('') }} style={{ fontSize: 12, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>เปลี่ยน</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', border: '1px solid var(--border)', borderRadius: 11, background: 'var(--surface-2)' }}>
                          <Icon name="search" size={16} color="var(--text-faint)" width={2} />
                          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นด้วยรหัสหน่วยงาน (hcode) หรือชื่อ…"
                            style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5, outline: 'none', padding: '11px 0' }} />
                        </div>
                        {q.trim().length >= 1 && (
                          <div style={{ marginTop: 6, maxHeight: 230, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 11, background: 'var(--surface)' }}>
                            {loading ? (
                              <div style={{ padding: '14px 13px', fontSize: 13, color: 'var(--text-faint)' }}>กำลังค้นหา…</div>
                            ) : searchErr ? (
                              <div style={{ padding: '12px 13px' }}>
                                <div style={{ fontSize: 13, color: 'var(--warn)' }}>{searchErr}</div>
                                <UseCodeBtn q={q} onPick={setPicked} />
                              </div>
                            ) : results.length === 0 ? (
                              <div style={{ padding: '12px 13px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>ไม่พบหน่วยงานที่ตรงกับ “{q.trim()}”</div>
                                <UseCodeBtn q={q} onPick={setPicked} />
                              </div>
                            ) : (
                              results.map((h) => (
                                <button key={h.hcode} onClick={() => setPicked(h)} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '10px 13px', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13 }}>
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-strong)', background: 'var(--accent-soft)', borderRadius: 7, padding: '3px 8px', minWidth: 52, textAlign: 'center' }}>{h.hcode}</span>
                                  <span style={{ color: 'var(--text)' }}>{h.name || '(ไม่มีชื่อ)'}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* รูปแบบการใช้งาน */}
                  <div>
                    <label style={lbl}>รูปแบบการใช้งาน</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                      {([['demo', 'ขอทดลองใช้', 'ทดลองใช้ฟรี 60 วัน'], ['real', 'ขอใช้งานจริง', 'รอเจ้าหน้าที่ติดต่อกลับ']] as const).map(([v, t, sub]) => {
                        const on = type === v
                        return (
                          <button key={v} onClick={() => setType(v)} style={{
                            textAlign: 'left', padding: '13px 15px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--sans)',
                            border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                            background: on ? 'var(--accent-soft)' : 'var(--surface-2)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{t}</span>
                              {on ? (
                                <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)' }}>
                                  <Svg d={CHECK} size={10} sw={4} />
                                </span>
                              ) : (
                                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--border-strong)' }} />
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ผู้ติดต่อ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={lbl}>ชื่อผู้ติดต่อ{req}</label>
                      <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="ชื่อ-สกุล" style={field} />
                    </div>
                    <div>
                      <label style={lbl}>เบอร์โทรติดต่อ{req}</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" type="tel" inputMode="tel"
                        style={{ ...field, ...(phone.trim() && !phoneOk(phone) ? { borderColor: 'var(--danger)' } : {}) }} />
                      <FieldError show={!!phone.trim() && !phoneOk(phone)} text="เบอร์โทรไม่ถูกต้อง — ตัวเลขอย่างน้อย 8 หลัก" />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>อีเมล{req}</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.go.th" type="email" inputMode="email"
                      style={{ ...field, ...(email.trim() && !emailOk(email) ? { borderColor: 'var(--danger)' } : {}) }} />
                    <FieldError show={!!email.trim() && !emailOk(email)} text="รูปแบบอีเมลไม่ถูกต้อง เช่น name@hospital.go.th" />
                  </div>

                  {/* PDPA consent */}
                  <div onClick={() => setConsent((v) => !v)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 13px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {consent ? (
                      <span style={{ width: 19, height: 19, flex: 'none', borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, color: 'var(--on-accent)' }}>
                        <Svg d={CHECK} size={12} sw={4} />
                      </span>
                    ) : (
                      <span style={{ width: 19, height: 19, flex: 'none', borderRadius: 6, border: '1.5px solid var(--border-strong)', marginTop: 1 }} />
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.55 }}>
                      ยินยอมให้จัดเก็บและประมวลผลข้อมูลติดต่อเพื่อการพิจารณาคำขอ ตาม{' '}
                      <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPdpa(true) }}
                        style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        นโยบายความเป็นส่วนตัว (PDPA)
                      </a>
                    </span>
                  </div>

                  {err && <div style={{ fontSize: 12.5, color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 9, padding: '9px 12px' }}>{err}</div>}

                  {consent ? (
                    <button onClick={submit} disabled={busy} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--sans)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', opacity: busy ? .75 : 1 }}>
                      {busy ? 'กำลังส่งคำขอ…' : 'ส่งคำขอลงทะเบียน'}
                    </button>
                  ) : (
                    <button disabled title="กรุณายอมรับนโยบายความเป็นส่วนตัวก่อน" style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--surface-3)', color: 'var(--text-faint)', fontFamily: 'var(--sans)', fontSize: 14.5, fontWeight: 700, cursor: 'not-allowed' }}>
                      ส่งคำขอลงทะเบียน
                    </button>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', fontSize: 11.5, color: 'var(--text-faint)' }}>
                    <Svg d={['M3 11h18v10H3z', 'M7 11V7a5 5 0 0 1 10 0v4']} size={13} sw={2} />
                    ไม่มีค่าใช้จ่ายในการยื่นคำขอ · ข้อมูลถูกเข้ารหัสระหว่างส่ง
                  </div>
                </div>
              </div>

              {/* ขั้นตอนหลังส่งคำขอ */}
              <div style={{ ...card, marginTop: 16, overflow: 'hidden' }}>
                <button onClick={() => setStepsOpen((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '15px 18px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text-faint)' }}>ขั้นตอนหลังส่งคำขอ</span>
                  <Svg d={[stepsOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6']} size={17} sw={2.2} style={{ color: 'var(--text-faint)' }} />
                </button>
                {stepsOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '2px 18px 16px' }}>
                    {STEPS.map((s) => (
                      <div key={s.n} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                        <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-strong)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </main>

      {showPdpa && <PdpaModal onClose={() => setShowPdpa(false)} />}
    </div>
  )
}
