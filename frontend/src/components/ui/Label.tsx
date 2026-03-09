import { type LabelHTMLAttributes } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ children, required, className = '', ...rest }: LabelProps) {
  return (
    <label
      className={`text-xs font-semibold uppercase tracking-widest block mb-1.5 ${className}`}
      style={{ color: '#64748B' }}
      {...rest}
    >
      {children}
      {required && <span style={{ color: '#EF4444' }}> *</span>}
    </label>
  )
}
