import { forwardRef, type SelectHTMLAttributes } from 'react'

type Size = 'sm' | 'md' | 'lg'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  inputSize?: Size
  error?: boolean
  placeholder?: string
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'text-xs px-2 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-sm px-4 py-3',
}

const baseStyle: React.CSSProperties = {
  backgroundColor: 'rgba(99,102,241,0.08)',
  border: '1px solid rgba(99,102,241,0.15)',
  color: '#E2E8F0',
}

const errorStyle: React.CSSProperties = {
  ...baseStyle,
  border: '1px solid rgba(239,68,68,0.5)',
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, inputSize = 'md', error, placeholder, className = '', style, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-lg outline-none transition-colors ${SIZE_CLS[inputSize]} ${className}`}
        style={{ ...(error ? errorStyle : baseStyle), ...style }}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  },
)

Select.displayName = 'Select'
