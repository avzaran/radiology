import { useState, useCallback, useEffect } from 'react'
import { Card } from '../ui/Card'
import { SmartTextarea } from '../ui/SmartTextarea'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Label } from '../ui/Label'
import { Tabs } from '../ui/Tabs'
import { calcVolume } from '../../utils/calc'
import { type Template } from '../../utils/templateEngine'
import api from '../../api/client'
import { usePatientTabsStore } from '../../stores/patientTabsStore'
import { CalculatorSidePanel } from './CalculatorSidePanel'

// ─── Типы ────────────────────────────────────────────────────
type Modality = 'ct' | 'mri' | 'xray' | 'us' | 'mammography'

interface LesionRow {
  id: string
  name: string
  location: string
  size_a: string
  size_b: string
  size_c: string
  scale_type: string
  score: string
}

interface ReportForm {
  modality: Modality
  region: string
  contrast: boolean
  description: string
  conclusion: string
}

// ─── Константы ───────────────────────────────────────────────
const MODALITIES: { value: Modality; label: string }[] = [
  { value: 'ct',          label: 'КТ' },
  { value: 'mri',         label: 'МРТ' },
  { value: 'xray',        label: 'Рентген' },
  { value: 'us',          label: 'УЗИ' },
  { value: 'mammography', label: 'Маммография' },
]

const REGIONS: Record<Modality, string[]> = {
  ct:          ['Органы грудной клетки', 'Органы брюшной полости и таза', 'Голова', 'Позвоночник', 'Конечности'],
  mri:         ['Головной мозг', 'Позвоночник', 'Суставы', 'Органы малого таза', 'Брюшная полость'],
  xray:        ['Органы грудной клетки', 'Кости скелета', 'Брюшная полость'],
  us:          ['Органы брюшной полости', 'Щитовидная железа', 'Молочные железы', 'Органы малого таза', 'Сосуды'],
  mammography: ['Молочные железы'],
}

const STEPS = [
  { key: '0', label: '1. Исследование' },
  { key: '1', label: '2. Описание' },
  { key: '2', label: '3. Образования' },
  { key: '3', label: '4. Заключение' },
]

const SCALE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tirads', label: 'TI-RADS' },
  { value: 'fleischner', label: 'Fleischner' },
  { value: 'birads', label: 'BI-RADS' },
  { value: 'lungrads', label: 'Lung-RADS' },
]

const TEMPLATE_CACHE_KEY = 'rad_templates_v1'

function newLesion(): LesionRow {
  return { id: crypto.randomUUID(), name: '', location: '', size_a: '', size_b: '', size_c: '', scale_type: '', score: '' }
}

// ─── Утилита: форматирование готового протокола ───────────────
function buildPreview(form: ReportForm, lesions: LesionRow[]): string {
  const modalityLabels: Record<Modality, string> = {
    ct: 'Компьютерная томография', mri: 'Магнитно-резонансная томография',
    xray: 'Рентгенография', us: 'Ультразвуковое исследование', mammography: 'Маммография',
  }
  const lines: string[] = []
  lines.push('ПРОТОКОЛ ИССЛЕДОВАНИЯ')
  lines.push(`Вид: ${modalityLabels[form.modality]}${form.region ? ` — ${form.region}` : ''}`)
  lines.push(`Контрастное усиление: ${form.contrast ? 'применялось' : 'не применялось'}`)

  if (form.description.trim()) {
    lines.push('\nОПИСАНИЕ:')
    lines.push(form.description.trim())
  }

  const filledLesions = lesions.filter((l) => l.name.trim() && l.size_a)
  if (filledLesions.length > 0) {
    lines.push('\nОБРАЗОВАНИЯ:')
    for (const l of filledLesions) {
      const a = parseFloat(l.size_a)
      const b = l.size_b ? parseFloat(l.size_b) : undefined
      const c = l.size_c ? parseFloat(l.size_c) : undefined
      const dims = [l.size_a, l.size_b, l.size_c].filter(Boolean).join(' × ')
      const vol = calcVolume(a, b, c)
      const score = l.score ? ` [${l.scale_type ? l.scale_type.toUpperCase() + ': ' : ''}${l.score}]` : ''
      lines.push(`• ${l.name.trim()}${l.location ? ` (${l.location})` : ''}: ${dims} мм, V≈${vol.toFixed(0)} мм³${score}`)
    }
  }

  if (form.conclusion.trim()) {
    lines.push('\nЗАКЛЮЧЕНИЕ:')
    lines.push(form.conclusion.trim())
  }

  return lines.join('\n')
}

// ─── Props ───────────────────────────────────────────────────
interface NewProtocolTabProps {
  patientId: string | null  // null = standalone mode (from /reports route)
  tabId: string             // tab ID for promoteProtocolTab
}

// ─── Главный компонент ────────────────────────────────────────
export function NewProtocolTab({ patientId, tabId }: NewProtocolTabProps) {
  const [showCalc, setShowCalc] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ReportForm>({
    modality: 'ct', region: '', contrast: false, description: '', conclusion: '',
  })
  const [lesions, setLesions] = useState<LesionRow[]>([newLesion()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  const { promoteProtocolTab } = usePatientTabsStore()

  useEffect(() => {
    const cached = localStorage.getItem(TEMPLATE_CACHE_KEY)
    if (cached) {
      try { setTemplates(JSON.parse(cached) as Template[]) } catch { /* ignore corrupt cache */ }
    }
    api.get<Template[]>('/api/templates').then((r) => {
      setTemplates(r.data)
      localStorage.setItem(TEMPLATE_CACHE_KEY, JSON.stringify(r.data))
    }).catch(() => { /* работаем с кэшем */ })
  }, [])

  const preview = buildPreview(form, lesions)

  const setField = useCallback(<K extends keyof ReportForm>(key: K, val: ReportForm[K]) => {
    setForm((f) => ({ ...f, [key]: val }))
  }, [])

  const updateLesion = (id: string, key: keyof LesionRow, val: string) => {
    setLesions((ls) => ls.map((l) => (l.id === id ? { ...l, [key]: val } : l)))
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const lesions_json = lesions
        .filter((l) => l.name.trim() && l.size_a)
        .map((l) => ({
          name: l.name.trim(),
          location: l.location || undefined,
          size_a: parseFloat(l.size_a),
          size_b: l.size_b ? parseFloat(l.size_b) : undefined,
          size_c: l.size_c ? parseFloat(l.size_c) : undefined,
          volume_mm3: calcVolume(parseFloat(l.size_a), l.size_b ? parseFloat(l.size_b) : undefined, l.size_c ? parseFloat(l.size_c) : undefined),
          scale_type: l.scale_type || undefined,
          score: l.score || undefined,
        }))
      const response = await api.post<{ data: { id: string; created_at: string } }>('/api/reports/generate', {
        ...form,
        patient_id: patientId,
        lesions_json,
      })
      // Promote tab if we're in patient context
      if (patientId && tabId !== 'standalone') {
        const reportId = response.data.data.id
        const date = new Date(response.data.data.created_at).toLocaleDateString('ru-RU')
        promoteProtocolTab(patientId, tabId, reportId, date)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm({ modality: 'ct', region: '', contrast: false, description: '', conclusion: '' })
    setLesions([newLesion()])
    setStep(0)
    setSaved(false)
  }

  return (
    <div className="flex h-full">
      <div className={`flex-1 overflow-y-auto ${showCalc ? 'max-w-2xl' : 'max-w-4xl'} mx-auto flex flex-col gap-4 p-4`}>
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Новый протокол
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCalc((v) => !v)}
          >
            {showCalc ? 'Скрыть калькуляторы' : 'Калькуляторы'}
          </Button>
        </div>

        {/* Прогресс */}
        <Tabs
          tabs={STEPS}
          active={String(step)}
          onChange={(key) => setStep(Number(key))}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Левая панель — форма */}
          <div className="flex flex-col gap-3">
            {step === 0 && <StepModality form={form} setField={setField} />}
            {step === 1 && (
              <StepDescription form={form} setField={setField} templates={templates} />
            )}
            {step === 2 && (
              <StepLesions lesions={lesions} setLesions={setLesions} updateLesion={updateLesion} />
            )}
            {step === 3 && (
              <StepConclusion form={form} setField={setField} templates={templates} />
            )}

            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="secondary" size="md" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                  ← Назад
                </Button>
              )}
              {step < STEPS.length - 1 && (
                <Button size="md" className="flex-1" onClick={() => setStep((s) => s + 1)}>
                  Далее →
                </Button>
              )}
            </div>
          </div>

          {/* Правая панель — превью и экспорт */}
          <div className="flex flex-col gap-3">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <Label>Превью протокола</Label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    style={{
                      backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.1)',
                      color: copied ? '#22C55E' : '#6366F1',
                      border: 'none',
                    }}
                  >
                    {copied ? '✓ Скопировано' : 'Копировать'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={saving}
                    onClick={handleSave}
                    style={{
                      backgroundColor: saved ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                      color: saved ? '#22C55E' : '#6366F1',
                      border: 'none',
                    }}
                  >
                    {saved ? '✓ Сохранено' : 'Сохранить'}
                  </Button>
                </div>
              </div>
              <pre
                className="text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: '#E2E8F0', fontFamily: 'JetBrains Mono, monospace', minHeight: 200 }}
              >
                {preview || <span style={{ color: '#64748B' }}>Заполните форму для предпросмотра...</span>}
              </pre>
            </Card>
          </div>
        </div>
      </div>
      {showCalc && (
        <div className="w-96 flex-shrink-0">
          <CalculatorSidePanel onClose={() => setShowCalc(false)} />
        </div>
      )}
    </div>
  )
}

// ─── Шаги формы ──────────────────────────────────────────────

type SetField = <K extends keyof ReportForm>(k: K, v: ReportForm[K]) => void

function StepModality({ form, setField }: { form: ReportForm; setField: SetField }) {
  const regions = REGIONS[form.modality]
  const modalityTabs = MODALITIES.map((m) => ({ key: m.value, label: m.label }))

  return (
    <Card>
      <Label>Модальность</Label>
      <Tabs
        tabs={modalityTabs}
        active={form.modality}
        onChange={(key) => { setField('modality', key as Modality); setField('region', '') }}
        className="mb-4"
      />

      <Label>Область исследования</Label>
      <div className="flex flex-wrap gap-2 mb-4">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setField('region', r)}
            className="px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: form.region === r ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.05)',
              color: form.region === r ? '#06B6D4' : '#64748B',
              border: `1px solid ${form.region === r ? '#06B6D4' : 'rgba(99,102,241,0.1)'}`,
            }}
          >
            {r}
          </button>
        ))}
        <Input
          placeholder="Или введите вручную..."
          value={regions.includes(form.region) ? '' : form.region}
          onChange={(e) => setField('region', e.target.value)}
          inputSize="sm"
          className="w-auto"
          style={{ minWidth: 160 }}
        />
      </div>

      <Label>Контрастное усиление</Label>
      <Tabs
        tabs={[
          { key: 'false', label: 'Не применялось' },
          { key: 'true', label: 'Применялось' },
        ]}
        active={String(form.contrast)}
        onChange={(key) => setField('contrast', key === 'true')}
      />
    </Card>
  )
}

function StepDescription({
  form,
  setField,
  templates,
}: {
  form: ReportForm
  setField: SetField
  templates: Template[]
}) {
  return (
    <Card>
      <Label>Описательная часть</Label>
      <SmartTextarea
        value={form.description}
        onChange={(v) => setField('description', v)}
        placeholder="Лёгочные поля без очаговых и инфильтративных изменений. Синусы свободны..."
        rows={12}
        section="description"
        modality={form.modality}
        region={form.region}
        templates={templates}
      />
    </Card>
  )
}

function StepLesions({
  lesions,
  setLesions,
  updateLesion,
}: {
  lesions: LesionRow[]
  setLesions: React.Dispatch<React.SetStateAction<LesionRow[]>>
  updateLesion: (id: string, key: keyof LesionRow, val: string) => void
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Label>Образования</Label>
        <Button variant="secondary" size="sm" onClick={() => setLesions((ls) => [...ls, newLesion()])}>
          + Добавить
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {lesions.map((l, idx) => {
          const a = parseFloat(l.size_a) || 0
          const b = parseFloat(l.size_b) || undefined
          const c = parseFloat(l.size_c) || undefined
          const vol = a > 0 ? calcVolume(a, b, c) : null

          return (
            <div
              key={l.id}
              className="rounded-lg p-3 flex flex-col gap-2"
              style={{ backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold"
                  style={{ color: '#6366F1', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  #{idx + 1}
                </span>
                {lesions.length > 1 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setLesions((ls) => ls.filter((x) => x.id !== l.id))}
                  >
                    Удалить
                  </Button>
                )}
              </div>

              <div className="flex-1">
                <label className="text-xs block mb-1" style={{ color: '#64748B' }}>Название</label>
                <Input
                  value={l.name}
                  onChange={(e) => updateLesion(l.id, 'name', e.target.value)}
                  placeholder="Узел S6 правого лёгкого"
                  inputSize="sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs block mb-1" style={{ color: '#64748B' }}>Локализация</label>
                <Input
                  value={l.location}
                  onChange={(e) => updateLesion(l.id, 'location', e.target.value)}
                  placeholder="Нижняя доля, субплеврально"
                  inputSize="sm"
                />
              </div>

              <div className="flex gap-2">
                <SizeField label="a, мм" value={l.size_a} onChange={(v) => updateLesion(l.id, 'size_a', v)} />
                <SizeField label="b, мм" value={l.size_b} onChange={(v) => updateLesion(l.id, 'size_b', v)} />
                <SizeField label="c, мм" value={l.size_c} onChange={(v) => updateLesion(l.id, 'size_c', v)} />
              </div>

              {vol !== null && (
                <div className="text-xs" style={{ color: '#06B6D4', fontFamily: 'JetBrains Mono, monospace' }}>
                  V ≈ {vol.toFixed(0)} мм³
                </div>
              )}

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: '#64748B' }}>Шкала</label>
                  <Select
                    options={SCALE_OPTIONS}
                    value={l.scale_type}
                    onChange={(e) => updateLesion(l.id, 'scale_type', e.target.value)}
                    inputSize="sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs block mb-1" style={{ color: '#64748B' }}>Результат</label>
                  <Input
                    value={l.score}
                    onChange={(e) => updateLesion(l.id, 'score', e.target.value)}
                    placeholder="TR3, 3 мес КТ..."
                    inputSize="sm"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function StepConclusion({
  form,
  setField,
  templates,
}: {
  form: ReportForm
  setField: SetField
  templates: Template[]
}) {
  return (
    <Card>
      <Label>Заключение</Label>
      <SmartTextarea
        value={form.conclusion}
        onChange={(v) => setField('conclusion', v)}
        placeholder="Солидный узел S6 правого лёгкого 8 мм. По Fleischner 2017 — контрольное КТ через 3–6 мес..."
        rows={10}
        section="conclusion"
        modality={form.modality}
        region={form.region}
        templates={templates}
      />
    </Card>
  )
}

// ─── SizeField (специфический компонент для размеров) ────────
function SizeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="w-20">
      <label className="text-xs block mb-1" style={{ color: '#64748B' }}>
        {label}
      </label>
      <Input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputSize="sm"
        className="text-right"
        style={{
          backgroundColor: 'rgba(6,182,212,0.08)',
          border: '1px solid rgba(6,182,212,0.2)',
          color: '#06B6D4',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      />
    </div>
  )
}
