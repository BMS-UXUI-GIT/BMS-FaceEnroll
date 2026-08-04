import React from 'react'

// กันหน้าใดหน้าหนึ่งพังแล้วลากทั้งแอปจอดำ — โชว์ข้อความ + ปุ่มลองใหม่แทน

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // เปลี่ยนหน้า/เปลี่ยนโรง = เคลียร์ error ให้ลอง render ใหม่
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 640, margin: '40px auto', padding: '28px 26px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>😵</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>หน้านี้มีข้อผิดพลาด</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--mono)', marginBottom: 16, wordBreak: 'break-all' }}>{String(this.state.error)}</div>
        <button onClick={() => this.setState({ error: null })}
          style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer' }}>
          ลองใหม่
        </button>
      </div>
    )
  }
}
