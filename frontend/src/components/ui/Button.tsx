import { type ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const BASE =
  'inline-flex items-center justify-center font-medium rounded-lg transition-all outline-none disabled:opacity-50 disabled:pointer-events-none'

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#6366F1',
    color: '#fff',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: '#E2E8F0',
    border: '1px solid rgba(99,102,241,0.25)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#64748B',
  },
  danger: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#EF4444',
  },
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-3 gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${SIZE_CLS[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={VARIANT_STYLES[variant]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
