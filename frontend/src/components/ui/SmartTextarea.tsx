import { useState, useEffect, useRef, useCallback } from 'react'
import { getSuggestions, type Template, type Suggestion } from '../../utils/templateEngine'
import { useSpeechInput } from '../../hooks/useSpeechInput'

interface SmartTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  section: 'description' | 'conclusion'
  modality: string
  region: string
  templates: Template[]
}

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
  section,
  modality,
  region,
  templates,
}: SmartTextareaProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const [interimText, setInterimText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Обновление подсказок с дебаунсом 300 мс
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!templates.length) return
    debounceRef.current = setTimeout(() => {
      const result = getSuggestions(value, templates, { section, modality, region })
      setSuggestions(result)
      setSelectedIdx(0)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, templates, section, modality, region])

  // Вставка шаблона в конец текста
  const insertTemplate = useCallback(
    (template: Template) => {
      const sep = value.length > 0 && !value.endsWith('\n') ? ' ' : ''
      onChange(value + sep + template.text)
      setSuggestions([])
      setTimeout(() => textareaRef.current?.focus(), 0)
    },
    [value, onChange]
  )

  // Клавиатурная навигация
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestions.length) return
    if (e.key === 'Tab') {
      e.preventDefault()
      insertTemplate(suggestions[selectedIdx].template)
    } else if (e.key === 'Escape') {
      setSuggestions([])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      insertTemplate(suggestions[selectedIdx].template)
    }
  }

  // Голосовой ввод — колбэки через useCallback (стабильные ссылки)
  const handleInterim = useCallback((text: string) => {
    setInterimText(text)
  }, [])

  const handleFinal = useCallback(
    (text: string) => {
      setInterimText('')
      const sep = value.length > 0 && !value.endsWith('\n') ? ' ' : ''
      onChange(value + sep + text.trim())
    },
    [value, onChange]
  )

  const { isSupported, isListening, start, stop } = useSpeechInput({
    onInterim: handleInterim,
    onFinal: handleFinal,
  })

  const showSuggestions = isFocused && suggestions.length > 0

  return (
    <div className="flex flex-col gap-2">
      {/* Тулбар */}
      <div className="flex items-center justify-between min-h-[24px]">
        <span className="text-xs" style={{ color: '#64748B' }}>
          {showSuggestions
            ? `${suggestions.length} шабл. — Tab вставить · ↑↓ навигация · Esc закрыть`
            : ''}
        </span>
        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stop : start}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)',
              color: isListening ? '#EF4444' : '#6366F1',
              border: `1px solid ${isListening ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.2)'}`,
            }}
          >
            {isListening ? (
              <>
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#EF4444' }}
                />
                Стоп
              </>
            ) : (
              <>
                <span style={{ fontSize: 12 }}>🎤</span>
                Голос
              </>
            )}
          </button>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg px-3 py-3 text-sm outline-none resize-none leading-relaxed"
        style={{
          backgroundColor: 'rgba(99,102,241,0.05)',
          border: `1px solid ${isListening ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.15)'}`,
          color: '#E2E8F0',
          fontFamily: 'Inter, sans-serif',
          transition: 'border-color 0.2s',
        }}
      />

      {/* Промежуточный текст распознавания */}
      {interimText && (
        <div
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'rgba(239,68,68,0.05)',
            border: '1px dashed rgba(239,68,68,0.2)',
            color: '#94A3B8',
            fontStyle: 'italic',
          }}
        >
          🎤 {interimText}
        </div>
      )}

      {/* Панель подсказок */}
      {showSuggestions && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid rgba(99,102,241,0.25)', backgroundColor: '#0F172A' }}
        >
          <div
            className="px-3 py-1.5 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', backgroundColor: 'rgba(99,102,241,0.06)' }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#6366F1', fontFamily: 'JetBrains Mono, monospace' }}
            >
              Шаблоны
            </span>
            <span className="text-xs" style={{ color: '#475569' }}>
              Enter+Ctrl или клик для вставки
            </span>
          </div>

          {suggestions.map((s, idx) => (
            <button
              key={s.template.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertTemplate(s.template)
              }}
              className="w-full px-3 py-2.5 text-left transition-colors flex flex-col gap-1"
              style={{
                backgroundColor: idx === selectedIdx ? 'rgba(99,102,241,0.1)' : 'transparent',
                borderBottom:
                  idx < suggestions.length - 1 ? '1px solid rgba(99,102,241,0.07)' : undefined,
              }}
            >
              {/* Текст шаблона */}
              <div className="text-xs leading-relaxed" style={{ color: '#CBD5E1' }}>
                {s.template.text.length > 100
                  ? s.template.text.slice(0, 100) + '…'
                  : s.template.text}
              </div>

              {/* Совпавшие ключевые слова */}
              {s.matchedKeywords.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {s.matchedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
