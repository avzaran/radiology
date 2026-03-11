import { useState } from 'react'
import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { Label } from '../ui/Label'
import { calcLungRads, getLungRadsDescription, type LungRadsInput, type CalcResult } from '../../utils/calculators'

interface Props {
  ResultPanel: React.ComponentType<{ result: CalcResult | null; scaleType: string; inputJson: object }>
}

const SCAN_TABS = [
  { key: 'baseline', label: 'Первичное НДКТ' },
  { key: 'annual',   label: 'Ежегодное НДКТ' },
]

const CATEGORY_TABS = [
  { key: '1',  label: '1' },
  { key: '2',  label: '2' },
  { key: '3',  label: '3' },
  { key: '4A', label: '4A' },
  { key: '4B', label: '4B' },
  { key: '4X', label: '4X' },
]

export function LungRadsCalculator({ ResultPanel }: Props) {
  const [form, setForm] = useState<LungRadsInput>({
    scanType: 'baseline',
    category: '1',
  })

  const result = calcLungRads(form)
  const description = getLungRadsDescription(form.category)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-sm font-semibold mb-5" style={{ color: '#E2E8F0' }}>
          Lung-RADS 2022 — Параметры
        </h2>

        <div className="space-y-5">
          <div>
            <Label>Тип исследования</Label>
            <Tabs
              tabs={SCAN_TABS}
              active={form.scanType}
              onChange={(v) => setForm((f) => ({ ...f, scanType: v as LungRadsInput['scanType'] }))}
            />
          </div>

          <div>
            <Label>Категория Lung-RADS</Label>
            <Tabs
              tabs={CATEGORY_TABS}
              active={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v as LungRadsInput['category'] }))}
            />
            <div
              className="mt-3 px-3 py-2.5 rounded-lg text-xs"
              style={{
                backgroundColor: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.1)',
              }}
            >
              <span className="font-semibold" style={{ color: '#E2E8F0' }}>
                Lung-RADS {form.category}:{' '}
              </span>
              <span style={{ color: '#94A3B8' }}>{description}</span>
            </div>
          </div>
        </div>
      </Card>

      <ResultPanel result={result} scaleType="lungrads" inputJson={form} />
    </div>
  )
}
