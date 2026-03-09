interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  glow?: boolean
}

export function Card({ children, className = '', style, glow }: CardProps) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        backgroundColor: '#0F172A',
        border: '1px solid rgba(99,102,241,0.15)',
        boxShadow: glow ? '0 0 20px rgba(99,102,241,0.12)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
