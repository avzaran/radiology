import { useState } from 'react'
import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { Label } from '../ui/Label'
import { calcPiRads, type PiRadsInput, type CalcResult } from '../../utils/calculators'

interface Props {
  ResultPanel: React.ComponentType<{ result: CalcResult | null; scaleType: string; inputJson: object }>
}

const ZONE_TABS = [
  { key: 'pz', label: 'Периферическая зона' },
  { key: 'tz', label: 'Переходная зона' },
]

const SCORE_TABS = [1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: String(n) }))

const DCE_TABS = [
  { key: 'positive', label: 'Позитивное' },
  { key: 'negative', label: 'Негативное' },
]

const T2W_DESCRIPTIONS: Record<'pz' | 'tz', Record<number, string>> = {
  pz: {
    1: 'Нормальная гиперинтенсивность периферической зоны',
    2: 'Линейное/клиновидное или диффузное слабогипоинтенсивное',
    3: 'Гетерогенный или диффузный гипоинтенсивный сигнал без чётких границ',
    4: 'Умеренно гипоинтенсивный очаг ≥1.5 см',
    5: 'Аналогично 4 + экстракапсулярное распространение',
  },
  tz: {
    1: 'Нормально выглядящая переходная зона',
    2: 'Чётко очерченный однородный инкапсулированный узел',
    3: 'Гетерогенный с нечёткими краями (неинкапсулированный)',
    4: 'Чечевицеобразный или неправильной формы однородный умеренно гипоинтенсивный ≥1.5 см',
    5: 'Аналогично 4 + экстракапсулярное распространение',
  },
}

const DWI_DESCRIPTIONS: Record<number, string> = {
  1: 'Нет ограничения диффузии',
  2: 'Диффузно ограниченная диффузия',
  3: 'Очаговое слабое или умеренное ограничение диффузии',
  4: 'Очаговое выраженное ограничение диффузии, <1.5 см (гипоинт. ADC, гиперинт. DWI)',
  5: 'Аналогично 4, ≥1.5 см или с экстракапсулярным распространением',
}

export function PiRadsCalculator({ ResultPanel }: Props) {
  const [form, setForm] = useState<PiRadsInput>({
    zone: 'pz',
    t2w: 3,
    dwi: 3,
    dce: 'negative',
  })

  const result = calcPiRads(form)
  const showDce = form.zone === 'pz' && form.dwi === 3

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-sm font-semibold mb-5" style={{ color: '#E2E8F0' }}>
          Pi-RADS v2.1 — Параметры
        </h2>

        <div className="space-y-5">
          <div>
            <Label>Зона простаты</Label>
            <Tabs
              tabs={ZONE_TABS}
              active={form.zone}
              onChange={(v) => setForm((f) => ({ ...f, zone: v as PiRadsInput['zone'] }))}
            />
          </div>

          <div>
            <Label>T2W (балл 1–5)</Label>
            <Tabs
              tabs={SCORE_TABS}
              active={String(form.t2w)}
              onChange={(v) => setForm((f) => ({ ...f, t2w: Number(v) as PiRadsInput['t2w'] }))}
            />
            <p
              className="text-xs mt-2 px-3 py-2 rounded-lg"
              style={{ color: '#94A3B8', backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}
            >
              {T2W_DESCRIPTIONS[form.zone][form.t2w]}
            </p>
          </div>

          <div>
            <Label>DWI (балл 1–5)</Label>
            <Tabs
              tabs={SCORE_TABS}
              active={String(form.dwi)}
              onChange={(v) => setForm((f) => ({ ...f, dwi: Number(v) as PiRadsInput['dwi'] }))}
            />
            <p
              className="text-xs mt-2 px-3 py-2 rounded-lg"
              style={{ color: '#94A3B8', backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}
            >
              {DWI_DESCRIPTIONS[form.dwi]}
            </p>
          </div>

          <div>
            <Label>DCE (динамическое контрастирование)</Label>
            <div className={showDce ? '' : 'opacity-40 pointer-events-none'}>
              <Tabs
                tabs={DCE_TABS}
                active={form.dce}
                onChange={(v) => setForm((f) => ({ ...f, dce: v as PiRadsInput['dce'] }))}
              />
            </div>
            {!showDce && (
              <p className="text-xs mt-2" style={{ color: '#64748B' }}>
                DCE учитывается только при периферической зоне + DWI = 3
              </p>
            )}
          </div>
        </div>
      </Card>

      <ResultPanel result={result} scaleType="pirads" inputJson={form} />
    </div>
  )
}
