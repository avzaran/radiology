import { useState } from 'react'
import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { calcFleischner, type FleischnerInput, type CalcResult } from '../../utils/calculators'

interface Props {
  ResultPanel: React.ComponentType<{ result: CalcResult | null; scaleType: string; inputJson: object }>
}

const TYPE_TABS = [
  { key: 'solid',     label: 'Солидный' },
  { key: 'ggn',       label: 'Чистое матовое стекло' },
  { key: 'partsolid', label: 'Частично солидный' },
]

const RISK_TABS = [
  { key: 'low',  label: 'Низкий риск' },
  { key: 'high', label: 'Высокий риск' },
]

export function FleischnerCalculator({ ResultPanel }: Props) {
  const [form, setForm] = useState<FleischnerInput>({
    noduleType: 'solid',
    riskLevel: 'low',
    sizeMm: 0,
  })

  const result = calcFleischner(form)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-sm font-semibold mb-5" style={{ color: '#E2E8F0' }}>
          Fleischner Society 2017 — Параметры
        </h2>

        <div className="space-y-5">
          <div>
            <Label>Тип узла</Label>
            <Tabs
              tabs={TYPE_TABS}
              active={form.noduleType}
              onChange={(v) => setForm((f) => ({ ...f, noduleType: v as FleischnerInput['noduleType'] }))}
            />
          </div>

          {form.noduleType === 'solid' && (
            <div>
              <Label>Уровень риска пациента</Label>
              <Tabs
                tabs={RISK_TABS}
                active={form.riskLevel}
                onChange={(v) => setForm((f) => ({ ...f, riskLevel: v as FleischnerInput['riskLevel'] }))}
              />
              <p className="text-xs mt-2" style={{ color: '#64748B' }}>
                Высокий риск: курение, воздействие радона, профвредности, семейный анамнез
              </p>
            </div>
          )}

          <div>
            <Label>Размер узла (мм)</Label>
            <Input
              type="number"
              inputSize="md"
              placeholder="Введите размер в мм"
              value={form.sizeMm || ''}
              onChange={(e) => setForm((f) => ({ ...f, sizeMm: Number(e.target.value) || 0 }))}
            />
            <p className="text-xs mt-2" style={{ color: '#64748B' }}>
              Среднее значение длинной и короткой оси
            </p>
          </div>
        </div>
      </Card>

      <ResultPanel result={result} scaleType="fleischner" inputJson={form} />
    </div>
  )
}
