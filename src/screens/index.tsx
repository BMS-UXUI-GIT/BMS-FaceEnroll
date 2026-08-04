import { Icon } from '../icons'

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow)',
}

export function Placeholder({ title, phase, note }: { title: string; phase: string; note: string }) {
  return (
    <div style={{ maxWidth: 'var(--page-max)' }}>
      <div style={{ ...card, padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--accent-light)', color: 'var(--accent-active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="system" size={22} width={2} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-active)', background: 'var(--accent-light)', padding: '3px 10px', borderRadius: 20 }}>{phase}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 520, lineHeight: 1.6 }}>{note}</div>
      </div>
    </div>
  )
}

export { Overview } from './Overview'
export { Face } from './Face'
export { Attendance } from './Attendance'
export { Settings } from './Settings'
export { Health } from './Health'
