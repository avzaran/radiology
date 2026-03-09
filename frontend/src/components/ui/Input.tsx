import { forwardRef, type InputHTMLAttributes } from 'react'

type Size = 'sm' | 'md' | 'lg'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: Size
  error?: boolean
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'text-xs px-2 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-sm px-4 py-3',
}

const baseStyle: React.CSSProperties = {
  backgroundColor: 'rgba(99,102,241,0.05)',
  border: '1px solid rgba(99,102,241,0.15)',
  color: '#E2E8F0',
}

const errorStyle: React.CSSProperties = {
  ...baseStyle,
  border: '1px solid rgba(239,68,68,0.5)',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ inputSize = 'md', error, className = '', style, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg outline-none placeholder:text-text-secondary transition-colors ${SIZE_CLS[inputSize]} ${className}`}
        style={{ ...(error ? errorStyle : baseStyle), ...style }}
        {...rest}
      />
    )
  },
)

Input.displayName = 'Input'
