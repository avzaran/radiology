type RiskLevel = 'green' | 'yellow' | 'orange' | 'red' | 'neutral'

const COLORS: Record<RiskLevel, { bg: string; text: string; glow: string }> = {
  green:   { bg: 'rgba(34,197,94,0.1)',   text: '#22C55E', glow: 'rgba(34,197,94,0.25)' },
  yellow:  { bg: 'rgba(234,179,8,0.1)',   text: '#EAB308', glow: 'rgba(234,179,8,0.25)' },
  orange:  { bg: 'rgba(249,115,22,0.1)',  text: '#F97316', glow: 'rgba(249,115,22,0.25)' },
  red:     { bg: 'rgba(239,68,68,0.1)',   text: '#EF4444', glow: 'rgba(239,68,68,0.25)' },
  neutral: { bg: 'rgba(99,102,241,0.1)',  text: '#6366F1', glow: 'rgba(99,102,241,0.25)' },
}

interface RiskBadgeProps {
  level: RiskLevel
  label: string
  large?: boolean
}

export function RiskBadge({ level, label, large }: RiskBadgeProps) {
  const c = COLORS[level]
  return (
    <span
      className={`inline-flex items-center rounded-lg font-bold ${large ? 'px-4 py-2 text-base' : 'px-2.5 py-0.5 text-xs'}`}
      style={{
        backgroundColor: c.bg,
        color: c.text,
        boxShadow: `0 0 12px ${c.glow}`,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {label}
    </span>
  )
}
