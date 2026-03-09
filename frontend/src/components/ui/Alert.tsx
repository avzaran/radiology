type Variant = 'error' | 'warning' | 'info' | 'success'

interface AlertProps {
  variant?: Variant
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

const STYLES: Record<Variant, React.CSSProperties> = {
  error:   { backgroundColor: 'rgba(239,68,68,0.1)',  color: '#EF4444' },
  warning: { backgroundColor: 'rgba(234,179,8,0.1)',  color: '#EAB308' },
  info:    { backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' },
  success: { backgroundColor: 'rgba(34,197,94,0.1)',  color: '#22C55E' },
}

export function Alert({ variant = 'error', children, onClose, className = '' }: AlertProps) {
  return (
    <div
      className={`text-xs px-3 py-2 rounded-lg flex items-center justify-between ${className}`}
      style={STYLES[variant]}
    >
      <span>{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'inherit' }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
