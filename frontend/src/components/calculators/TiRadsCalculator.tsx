import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { calcTiRads, type TiRadsInput, type CalcResult } from '../../utils/calculators'
import { useState } from 'react'

interface Props {
  ResultPanel: React.ComponentType<{ result: CalcResult | null; scaleType: string; inputJson: object }>
}

const COMPOSITION_TABS = [
  { key: 'cystic',    label: 'Кистозный (0)' },
  { key: 'spongiform', label: 'Губчатый (0)' },
  { key: 'mixed',     label: 'Смешанный (1)' },
  { key: 'solid',     label: 'Солидный (2)' },
]

const ECHO_TABS = [
  { key: 'anechoic', label: 'Анэхогенный (0)' },
  { key: 'hyperiso', label: 'Гиперэхогенный (1)' },
  { key: 'hypo',     label: 'Гипоэхогенный (2)' },
  { key: 'very_hypo', label: 'Резко гипо (3)' },
]

const SHAPE_TABS = [
  { key: 'wider',  label: 'Шире высоты (0)' },
  { key: 'taller', label: 'Выше ширины (3)' },
]

const MARGIN_TABS = [
  { key: 'smooth',          label: 'Ровный (0)' },
  { key: 'ill_defined',     label: 'Нечёткий (0)' },
  { key: 'lobulated',       label: 'Дольчатый (2)' },
  { key: 'extrathyroidal',  label: 'Экстракапсулярный (3)' },
]

const FOCI_TABS = [
  { key: 'none',      label: 'Нет (0)' },
  { key: 'macrocalc', label: 'Макрокальцинаты (1)' },
  { key: 'peripheral', label: 'Периферические (2)' },
  { key: 'punctate',  label: 'Точечные (3)' },
]

export function TiRadsCalculator({ ResultPanel }: Props) {
  const [form, setForm] = useState<TiRadsInput>({
    composition: 'solid',
    echogenicity: 'hypo',
    shape: 'wider',
    margin: 'smooth',
    foci: 'none',
    sizeMax: undefined,
  })

  const result = calcTiRads(form)

  const set = <K extends keyof TiRadsInput>(key: K, val: TiRadsInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="text-sm font-semibold mb-5" style={{ color: '#E2E8F0' }}>
          TI-RADS ACR 2017 — Параметры
        </h2>

        <div className="space-y-5">
          <div>
            <Label>Состав</Label>
            <Tabs
              tabs={COMPOSITION_TABS}
              active={form.composition}
              onChange={(v) => set('composition', v as TiRadsInput['composition'])}
            />
          </div>

          <div>
            <Label>Эхогенность</Label>
            <Tabs
              tabs={ECHO_TABS}
              active={form.echogenicity}
              onChange={(v) => set('echogenicity', v as TiRadsInput['echogenicity'])}
            />
          </div>

          <div>
            <Label>Форма</Label>
            <Tabs
              tabs={SHAPE_TABS}
              active={form.shape}
              onChange={(v) => set('shape', v as TiRadsInput['shape'])}
            />
          </div>

          <div>
            <Label>Контуры</Label>
            <Tabs
              tabs={MARGIN_TABS}
              active={form.margin}
              onChange={(v) => set('margin', v as TiRadsInput['margin'])}
            />
          </div>

          <div>
            <Label>Эхогенные включения</Label>
            <Tabs
              tabs={FOCI_TABS}
              active={form.foci}
              onChange={(v) => set('foci', v as TiRadsInput['foci'])}
            />
          </div>

          <div>
            <Label>Максимальный размер (мм)</Label>
            <Input
              type="number"
              inputSize="md"
              placeholder="Введите размер в мм"
              value={form.sizeMax ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value)
                set('sizeMax', v)
              }}
            />
          </div>
        </div>
      </Card>

      <ResultPanel result={result} scaleType="tirads" inputJson={form} />
    </div>
  )
}
