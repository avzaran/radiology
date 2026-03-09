type Variant = 'default' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  variant?: Variant
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const STYLES: Record<Variant, React.CSSProperties> = {
  default: { backgroundColor: 'rgba(99,102,241,0.1)',  color: '#6366F1' },
  success: { backgroundColor: 'rgba(34,197,94,0.1)',   color: '#22C55E' },
  warning: { backgroundColor: 'rgba(234,179,8,0.1)',   color: '#EAB308' },
  danger:  { backgroundColor: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
}

export function Badge({ variant = 'default', dot, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-md ${className}`}
      style={STYLES[variant]}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      {children}
    </span>
  )
}
