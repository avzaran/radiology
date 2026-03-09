import { Label } from './Label'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, error, required, htmlFor, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}
