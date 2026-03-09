import { useState, useCallback, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { SmartTextarea } from '../components/ui/SmartTextarea'
import { calcVolume } from '../utils/calc'
import { type Template } from '../utils/templateEngine'
import api from '../api/client'

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

const STEPS = ['Исследование', 'Описание', 'Образования', 'Заключение']
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

// ─── Главный компонент ────────────────────────────────────────
export function ReportsPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ReportForm>({
    modality: 'ct', region: '', contrast: false, description: '', conclusion: '',
  })
  const [lesions, setLesions] = useState<LesionRow[]>([newLesion()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])

  // Загрузка шаблонов: сначала кэш, затем свежие данные с API
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
      await api.post('/api/reports/generate', { ...form, lesions_json })
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
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: '#E2E8F0' }}>
          Генератор заключений
        </h1>
        <button
          onClick={handleReset}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#64748B', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          Новый протокол
        </button>
      </div>

      {/* Прогресс */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: i === step ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.05)',
              color: i === step ? '#6366F1' : '#64748B',
              border: `1px solid ${i === step ? '#6366F1' : 'rgba(99,102,241,0.1)'}`,
            }}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

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
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
              >
                ← Назад
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#6366F1', color: '#fff' }}
              >
                Далее →
              </button>
            )}
          </div>
        </div>

        {/* Правая панель — превью и экспорт */}
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#64748B' }}
              >
                Превью протокола
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.1)',
                    color: copied ? '#22C55E' : '#6366F1',
                  }}
                >
                  {copied ? '✓ Скопировано' : 'Копировать'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: saved ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                    color: saved ? '#22C55E' : '#6366F1',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить'}
                </button>
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
  )
}

// ─── Шаги формы ──────────────────────────────────────────────

type SetField = <K extends keyof ReportForm>(k: K, v: ReportForm[K]) => void

function StepModality({ form, setField }: { form: ReportForm; setField: SetField }) {
  const regions = REGIONS[form.modality]
  return (
    <Card>
      <Label>Модальность</Label>
      <div className="flex flex-wrap gap-2 mb-4">
        {MODALITIES.map((m) => (
          <button
            key={m.value}
            onClick={() => { setField('modality', m.value); setField('region', '') }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: form.modality === m.value ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.05)',
              color: form.modality === m.value ? '#6366F1' : '#64748B',
              border: `1px solid ${form.modality === m.value ? '#6366F1' : 'rgba(99,102,241,0.1)'}`,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

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
        <input
          placeholder="Или введите вручную..."
          value={regions.includes(form.region) ? '' : form.region}
          onChange={(e) => setField('region', e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{
            backgroundColor: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.1)',
            color: '#E2E8F0',
            minWidth: 160,
          }}
        />
      </div>

      <Label>Контрастное усиление</Label>
      <div className="flex gap-2">
        {([false, true] as const).map((val) => (
          <button
            key={String(val)}
            onClick={() => setField('contrast', val)}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: form.contrast === val ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.05)',
              color: form.contrast === val ? '#6366F1' : '#64748B',
              border: `1px solid ${form.contrast === val ? '#6366F1' : 'rgba(99,102,241,0.1)'}`,
            }}
          >
            {val ? 'Применялось' : 'Не применялось'}
          </button>
        ))}
      </div>
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
        <button
          onClick={() => setLesions((ls) => [...ls, newLesion()])}
          className="text-xs px-3 py-1 rounded-lg"
          style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}
        >
          + Добавить
        </button>
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
                  <button
                    onClick={() => setLesions((ls) => ls.filter((x) => x.id !== l.id))}
                    className="text-xs"
                    style={{ color: '#EF4444' }}
                  >
                    Удалить
                  </button>
                )}
              </div>

              <Field
                label="Название"
                value={l.name}
                onChange={(v) => updateLesion(l.id, 'name', v)}
                placeholder="Узел S6 правого лёгкого"
              />
              <Field
                label="Локализация"
                value={l.location}
                onChange={(v) => updateLesion(l.id, 'location', v)}
                placeholder="Нижняя доля, субплеврально"
              />

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
                  <select
                    value={l.scale_type}
                    onChange={(e) => updateLesion(l.id, 'scale_type', e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-xs outline-none"
                    style={{
                      backgroundColor: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      color: '#E2E8F0',
                    }}
                  >
                    <option value="">—</option>
                    <option value="tirads">TI-RADS</option>
                    <option value="fleischner">Fleischner</option>
                    <option value="birads">BI-RADS</option>
                    <option value="lungrads">Lung-RADS</option>
                  </select>
                </div>
                <Field
                  label="Результат"
                  value={l.score}
                  onChange={(v) => updateLesion(l.id, 'score', v)}
                  placeholder="TR3, 3 мес КТ..."
                />
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

// ─── Атомарные хелперы ────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="text-xs font-semibold uppercase tracking-widest block mb-2"
      style={{ color: '#64748B' }}
    >
      {children}
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex-1">
      <label className="text-xs block mb-1" style={{ color: '#64748B' }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 rounded text-xs outline-none"
        style={{
          backgroundColor: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.15)',
          color: '#E2E8F0',
        }}
      />
    </div>
  )
}

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
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-xs outline-none text-right"
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
