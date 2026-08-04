import { useState } from 'react'
import { api } from '../../api'
import { Modal } from '../../components/feedback/Modal'
import { Button } from '../../components/inputs/Button'
import { TEXT } from '../../typography'
import type { LateRow } from './types'

const mono: React.CSSProperties = { fontFamily: 'var(--mono)' }
const fld: React.CSSProperties = {
  ...TEXT.body, ...mono,
  padding: 'var(--sp-2) var(--sp-3)', border: '1px solid var(--control-border)',
  borderRadius: 'var(--r-md)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 130,
}
const lb: React.CSSProperties = { ...TEXT.sm, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 'var(--sp-1)', display: 'block' }

// แก้เวลาเข้า-ออกย้อนหลัง — เขียนกลับระบบโรงพยาบาลจริง + ลง audit
export function FixTimeModal({ hcode, row, onClose, onSaved }: {
  hcode: string; row: LateRow; onClose: () => void; onSaved: () => void
}) {
  const clean = (s?: string) => {
    const v = (s || '').replace('(+1)', '').trim()
    return v === '—' ? '' : v
  }
  const [orig] = useState(() => {
    const [a, b] = row.io.split(' / ')
    return { in: clean(a), out: clean(b) }
  })
  const [tin, setTin] = useState(orig.in)
  const [tout, setTout] = useState(orig.out)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const changedIn = !!tin && tin !== orig.in
  const changedOut = !!tout && tout !== orig.out

  const save = async () => {
    if (busy || (!changedIn && !changedOut)) return
    setBusy(true); setErr(null)
    try {
      await api.post('/admin/attendance/correction', {
        hcode, emp_id: row.emp, date: row.date,
        in_time: changedIn ? tin : null,
        out_time: changedOut ? tout : null,
        reason: reason.trim(),
        // ควบเวร = วันเดียวมีหลายรอบ — บอกให้ชัดว่าแก้รอบไหน และรอบนั้นยังเป็นเวลาเดิมอยู่ไหม
        seq: row.seq ?? 0,
        expect_in: orig.in || '—',
        expect_out: orig.out || '—',
      })
      onSaved()
    } catch (e: any) {
      setErr(e?.message || 'บันทึกไม่สำเร็จ')
      setBusy(false)
    }
  }

  return (
    <Modal open title={`แก้เวลา — ${row.name}`} onClose={onClose} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <div style={{ ...TEXT.sm, color: 'var(--text-dim)', display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <span>วันที่ <b style={mono}>{row.date}</b></span>
          <span>เวร <b>{row.shift}</b></span>
          <span style={{ color: 'var(--danger)' }}>{row.issue}</span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <div>
            <label style={lb}>เวลาเข้า {orig.in && <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(เดิม {orig.in})</span>}</label>
            <input type="time" value={tin} onChange={(e) => setTin(e.target.value)} style={fld} />
          </div>
          <div>
            <label style={lb}>เวลาออก {orig.out && <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(เดิม {orig.out})</span>}</label>
            <input type="time" value={tout} onChange={(e) => setTout(e.target.value)} style={fld} />
          </div>
        </div>

        <div>
          <label style={lb}>เหตุผลที่แก้ (ลงประวัติการจัดการ)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ลืมสแกนออก มีใบรับรองหัวหน้าเวร"
            style={{ ...fld, fontFamily: 'var(--sans)', width: '100%' }} />
        </div>

        <div style={{ ...TEXT.caption, color: 'var(--warn)', lineHeight: 1.5 }}>
          บันทึกแล้วจะแก้ข้อมูลเวลาในระบบโรงพยาบาลจริง และเก็บประวัติว่าใครแก้ อะไร เมื่อไหร่
        </div>
        {err && <div style={{ ...TEXT.sm, color: 'var(--danger)' }}>ผิดพลาด: {err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={save} disabled={busy || (!changedIn && !changedOut)}>
            {busy ? 'กำลังบันทึก…' : 'บันทึกเวลาใหม่'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
