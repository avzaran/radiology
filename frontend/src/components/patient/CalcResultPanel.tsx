import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card'
import { RiskBadge } from '../ui/RiskBadge'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import type { CalcResult } from '../../utils/calculators'
import api from '../../api/client'

export interface ResultPanelProps {
  result: CalcResult | null
  scaleType: string
  inputJson: object
}

export function CalcResultPanel({ result, scaleType, inputJson }: ResultPanelProps) {
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)
  const prevInputRef = useRef(JSON.stringify(inputJson))

  useEffect(() => {
    const current = JSON.stringify(inputJson)
    if (current !== prevInputRef.current) {
      prevInputRef.current = current
      setAlert(null)
    }
  }, [inputJson])

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      await api.post(`/api/scales/${scaleType}/calculate`, {
        input_json: inputJson,
        score: result.scoreLabel,
        result: result.recommendation,
      })
      setAlert({ variant: 'success', message: 'Результат сохранён' })
    } catch {
      setAlert({ variant: 'error', message: 'Ошибка при сохранении' })
    } finally {
      setSaving(false)
    }
  }

  if (!result) {
    return (
      <Card className="flex items-center justify-center min-h-48">
        <p className="text-sm text-center" style={{ color: '#64748B' }}>
          Заполните параметры для расчёта
        </p>
      </Card>
    )
  }

  return (
    <Card glow>
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#E2E8F0' }}>
        Результат
      </h3>

      <div className="flex items-center gap-3 mb-5">
        <RiskBadge level={result.risk} label={result.category} large />
      </div>

      <div
        className="mb-5 p-3 rounded-lg"
        style={{
          backgroundColor: 'rgba(6,182,212,0.05)',
          border: '1px solid rgba(6,182,212,0.1)',
        }}
      >
        <p className="text-xs mb-1 font-semibold" style={{ color: '#06B6D4' }}>
          Рекомендация
        </p>
        <p className="text-sm" style={{ color: '#E2E8F0' }}>
          {result.recommendation}
        </p>
      </div>

      {alert && (
        <Alert variant={alert.variant} className="mb-3" onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving} fullWidth>
        Сохранить результат
      </Button>
    </Card>
  )
}
