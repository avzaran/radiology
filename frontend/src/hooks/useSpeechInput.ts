import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Локальные объявления типов Web Speech API ───────────────
interface SpeechAlt {
  readonly transcript: string
}
interface SpeechResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechAlt
  [index: number]: SpeechAlt
}
interface SpeechResultList {
  readonly length: number
  item(index: number): SpeechResult
  [index: number]: SpeechResult
}
interface SpeechEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechResultList
}
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionCtor | undefined
    webkitSpeechRecognition: SpeechRecognitionCtor | undefined
  }
}

// ─── Хук ─────────────────────────────────────────────────────

interface UseSpeechInputOptions {
  onInterim: (transcript: string) => void
  onFinal: (transcript: string) => void
}

export function useSpeechInput({ onInterim, onFinal }: UseSpeechInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Колбэки через рефы — recognition.onresult всегда видит свежие значения
  const onInterimRef = useRef(onInterim)
  const onFinalRef = useRef(onFinal)
  useEffect(() => { onInterimRef.current = onInterim }, [onInterim])
  useEffect(() => { onFinalRef.current = onFinal }, [onFinal])

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)

  const start = useCallback(() => {
    if (!isSupported) return
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          onFinalRef.current(text)
        } else {
          onInterimRef.current(text)
        }
      }
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [isSupported])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  return { isSupported, isListening, start, stop }
}
