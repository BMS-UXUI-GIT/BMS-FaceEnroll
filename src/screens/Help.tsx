import { useState } from 'react'
import { useApp } from '../state'

// หน้าช่วยเหลือ/คู่มือ — แบบ doc: สารบัญหัวข้อซ้าย + เนื้อหาขวา
// เพิ่มหัวข้อใหม่ = เพิ่มลง TOPICS อีก 1 ก้อน (id/title/icon/body)

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)' }

// ---------- ชิ้นส่วนช่วยจัดหน้าเนื้อหา ----------
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 4 }}>
      <div style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 14, fontFamily: 'var(--mono)' }}>{n}</div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 20, borderLeft: 'none' }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, marginTop: 3 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
      </div>
    </div>
  )
}
const Code = ({ children }: { children: React.ReactNode }) => (
  <code style={{ fontFamily: 'var(--mono)', fontSize: 12.5, background: 'var(--surface-gray)', padding: '2px 7px', borderRadius: 6, color: 'var(--text)', wordBreak: 'break-all' }}>{children}</code>
)
function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: React.ReactNode }) {
  const c = tone === 'warn' ? 'var(--warn)' : 'var(--accent)'
  const bg = tone === 'warn' ? 'var(--warn-light)' : 'var(--accent-light)'
  return (
    <div style={{ display: 'flex', gap: 9, padding: '11px 14px', borderRadius: 10, background: bg, border: `1px solid ${c}`, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6, margin: '2px 0' }}>
      <span style={{ flex: 'none', color: c, fontWeight: 500 }}>{tone === 'warn' ? '⚠️' : 'ℹ️'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
const H = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.6px', margin: '18px 0 12px' }}>{children}</div>
)

// ---------- หัวข้อ: ตั้งค่าแจ้งเตือนผ่าน Telegram ----------
function TelegramGuide() {
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
        เมื่อพนักงานสแกนลงเวลาสำเร็จ ระบบจะส่งข้อความแจ้งเข้า <b>กลุ่ม Telegram</b> ที่คุณตั้งไว้ (ชื่อ · ตำแหน่ง · เวลา)
        4 ขั้นตอน: สร้างบอท → สร้างกลุ่ม + เพิ่มบอท → เอา Chat ID → กรอก Bot Token + Chat ID ในระบบ
      </p>

      <H>ขั้นตอน</H>
      <Step n={1} title="สร้างบอท Telegram">
        <div>เปิดแอป Telegram ค้นหา <Code>@BotFather</Code> (มีเครื่องหมายติ๊กน้ำเงิน) แล้วกดเริ่มแชท</div>
        <div>พิมพ์ <Code>/newbot</Code> แล้วส่ง</div>
        <div>ตั้ง <b>ชื่อบอท</b> (โชว์ในแชท เช่น "แจ้งเตือนลงเวลา รพ.X")</div>
        <div>ตั้ง <b>username บอท</b> ต้องลงท้ายด้วย <Code>bot</Code> เช่น <Code>checkin_rpx_bot</Code></div>
        <div>BotFather จะส่ง <b>Bot Token</b> กลับมา หน้าตาแบบ <Code>123456789:AAE-xxxxxxxxxxxxxxxxx</Code></div>
        <Note tone="warn">เก็บ Bot Token เป็นความลับ — ใครมี token นี้ส่งข้อความในนามบอทได้ ถ้าหลุดให้พิมพ์ <Code>/revoke</Code> ใน BotFather เพื่อออก token ใหม่</Note>
      </Step>

      <Step n={2} title="สร้างกลุ่มและเพิ่มบอทเข้ากลุ่ม">
        <div>สร้างกลุ่มใหม่ใน Telegram (New Group) ตั้งชื่อ เช่น "ลงเวลา รพ.X"</div>
        <div>เพิ่มสมาชิก: ค้นหา username บอทที่เพิ่งสร้าง แล้วเพิ่มเข้ากลุ่ม</div>
        <div>แนะนำให้ตั้งบอทเป็น <b>ผู้ดูแลกลุ่ม (admin)</b> เพื่อให้ส่งข้อความได้แน่นอน</div>
        <div>พิมพ์ข้อความอะไรก็ได้ในกลุ่ม 1 ครั้ง เพื่อให้บอท "เห็น" กลุ่ม</div>
      </Step>

      <Step n={3} title="เอา Chat ID ของกลุ่ม">
        <div>เปิดเบราว์เซอร์ ไปที่ลิงก์นี้ (แทน <Code>{'<BOT_TOKEN>'}</Code> ด้วย token จากขั้นที่ 1):</div>
        <div><Code>https://api.telegram.org/bot{'<BOT_TOKEN>'}/getUpdates</Code></div>
        <div>มองหาค่า <Code>{'"chat":{"id":-100xxxxxxxxxx}'}</Code> — เลขที่ขึ้นต้นด้วย <Code>-100</Code> คือ <b>Chat ID</b> ของกลุ่ม</div>
        <Note>ถ้าลิงก์ขึ้น <Code>{'"result":[]'}</Code> ว่างเปล่า ให้กลับไปพิมพ์ข้อความในกลุ่มอีกครั้ง แล้วรีเฟรชลิงก์</Note>
      </Step>

      <Step n={4} title="กรอกในระบบ แล้วทดสอบ">
        <div>กลับมาหน้า <b>ตั้งค่าแอปสแกน</b> → หัวข้อ <b>แจ้งเตือน</b> 🔔 → เปิดสวิตช์ช่องทาง <b>Telegram</b></div>
        <div>วาง <b>Bot Token</b> (จากขั้นที่ 1) ในช่อง <Code>Bot Token</Code></div>
        <div>วาง <b>Chat ID</b> (จากขั้นที่ 3) ในช่อง <Code>Chat ID</Code> — ระบบบันทึกให้อัตโนมัติ</div>
        <div><b>ทดสอบ:</b> ให้พนักงานสแกนลงเวลา 1 ครั้ง → ข้อความควรเด้งเข้ากลุ่ม Telegram ภายในไม่กี่วินาที</div>
      </Step>

      <H>แก้ปัญหาที่พบบ่อย</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65 }}>
        <div><b style={{ color: 'var(--text)' }}>ข้อความไม่เข้ากลุ่ม</b> — เช็ก 3 อย่าง: บอทยังอยู่ในกลุ่มไหม · token/Chat ID ถูกต้องไหม · เปิดสวิตช์แจ้งเตือนแล้วหรือยัง</div>
        <div><b style={{ color: 'var(--text)' }}>อยากเปลี่ยนกลุ่ม</b> — เพิ่มบอทเข้ากลุ่มใหม่ เอา Chat ID ใหม่ แล้วอัปเดต token ในหน้าตั้งค่า</div>
        <div><b style={{ color: 'var(--text)' }}>Token หลุด/รั่ว</b> — พิมพ์ <Code>/revoke</Code> ใน BotFather เพื่อออก token ใหม่ แล้วอัปเดตในระบบ</div>
      </div>
    </div>
  )
}

type Topic = { id: string; title: string; icon: string; body: React.ReactNode }
const TOPICS: Topic[] = [
  { id: 'telegram', title: 'ตั้งค่าแจ้งเตือนผ่าน Telegram', icon: '🔔', body: <TelegramGuide /> },
  // เพิ่มหัวข้ออื่นในอนาคตที่นี่ (ลงทะเบียนใบหน้า / การสแกน / ฯลฯ)
]

export function Help() {
  const { setNav } = useApp()
  const [sel, setSel] = useState<string>(TOPICS[0].id)
  const topic = TOPICS.find((t) => t.id === sel) ?? TOPICS[0]

  return (
    <div style={{ maxWidth: 'var(--page-max)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>คู่มือการใช้งาน</h1>
        <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>เลือกหัวข้อที่ต้องการจากเมนูด้านซ้าย</span>
        <button onClick={() => setNav('settings')} style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 500, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>
          ← กลับหน้าตั้งค่า
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 240px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }} className="help-grid">
        {/* สารบัญหัวข้อ */}
        <div style={{ ...card, overflow: 'hidden', position: 'sticky', top: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.6px' }}>หัวข้อ</div>
          {TOPICS.map((t) => {
            const on = t.id === sel
            return (
              <button key={t.id} onClick={() => setSel(t.id)} className="row-hover" style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', cursor: 'pointer',
                border: 'none', borderLeft: `3px solid ${on ? 'var(--accent)' : 'transparent'}`,
                background: on ? 'var(--accent-light)' : 'transparent', fontFamily: 'var(--sans)',
                color: on ? 'var(--accent-active)' : 'var(--text-dim)', fontSize: 13, fontWeight: on ? 500 : 500,
              }}>
                <span style={{ fontSize: 16, flex: 'none' }}>{t.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
              </button>
            )
          })}
        </div>

        {/* เนื้อหา */}
        <div style={{ ...card, padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 24 }}>{topic.icon}</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{topic.title}</h2>
          </div>
          {topic.body}
        </div>
      </div>
    </div>
  )
}
