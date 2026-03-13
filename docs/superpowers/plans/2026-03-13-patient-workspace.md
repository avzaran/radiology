# Patient Workspace Architecture — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
> **UI quality:** Use `frontend-design:frontend-design` skill when creating visual components (PatientTabBar, PatientInfoTab, CalculatorSidePanel, SavedProtocolTab). Follow the dark theme design system: bg-base=#0A0E1A, bg-card=#0F172A, accent=#6366F1, data=#06B6D4.

**Goal:** Перестроить навигацию RadAssist PRO: сайдбар показывает только Главная + Пациенты (с подпунктами открытых пациентов). Каждый пациент открывается в рабочей области с VS Code-style вкладками (Инфо, Новый протокол, Сохранённый протокол). Калькуляторы встраиваются в форму протокола как боковая панель.

**Architecture:** Zustand store (`patientTabsStore`) уже содержит всю логику управления вкладками. Добавляем `persist` middleware для сохранения состояния в localStorage. URL `/patients/:id` идентифицирует активного пациента, переключение вкладок происходит через store без смены URL. AppShell получает иерархический сайдбар с sub-items открытых пациентов.

**Tech Stack:** React 18, TypeScript, Zustand (persist), React Router v6, Tailwind CSS v4, Vite

**Spec:** `docs/superpowers/specs/2026-03-13-patient-workspace-design.md`

---

## File Structure

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `stores/patientTabsStore.ts` | MODIFY | Добавить persist middleware + метод addSavedProtocolTab |
| `stores/patientTabsStore.test.ts` | MODIFY | Тесты для persist + addSavedProtocolTab |
| `components/patient/PatientTabBar.tsx` | CREATE | Горизонтальная строка вкладок (VS Code стиль) |
| `components/patient/PatientInfoTab.tsx` | CREATE | Карточка пациента + список протоколов + редактирование |
| `components/patient/NewProtocolTab.tsx` | CREATE | Wizard создания протокола (перенос из ReportsPage) |
| `components/patient/CalculatorSidePanel.tsx` | CREATE | Боковая панель с калькуляторами |
| `components/patient/SavedProtocolTab.tsx` | CREATE | Read-only просмотр протокола |
| `pages/PatientWorkspacePage.tsx` | CREATE | Контейнер рабочей области пациента |
| `components/layout/AppShell.tsx` | MODIFY | Иерархический сайдбар с sub-items пациентов |
| `pages/PatientsPage.tsx` | MODIFY | Клик на пациента → openPatient + navigate |
| `App.tsx` | MODIFY | Добавить route /patients/:id |
| `pages/ReportsPage.tsx` | MODIFY | Сделать wrapper вокруг NewProtocolTab |
| `components/patient/CalcResultPanel.tsx` | CREATE | ResultPanel вынесенный из CalculatorPage |
| `pages/CalculatorPage.tsx` | MODIFY | Импорт CalcResultPanel вместо inline ResultPanel |
| `pages/DashboardPage.tsx` | MODIFY | Убрать ссылки Трекер/Заключения из quick actions |

---

## Chunk 1: Store Foundation

### Task 1: patientTabsStore — persist middleware + addSavedProtocolTab

**Files:**
- Modify: `frontend/src/stores/patientTabsStore.ts`
- Modify: `frontend/src/stores/patientTabsStore.test.ts`

- [ ] **Step 1: Write test for addSavedProtocolTab**

В `patientTabsStore.test.ts` добавить тест-блок:

```typescript
describe('addSavedProtocolTab', () => {
  it('добавляет вкладку protocol-saved и переключает на неё', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().addSavedProtocolTab('1', 'report-42', '05.03.2026')
    const patient = usePatientTabsStore.getState().openPatients[0]
    expect(patient.tabs).toHaveLength(2)
    expect(patient.tabs[1].id).toBe('protocol-report-42')
    expect(patient.tabs[1].type).toBe('protocol-saved')
    expect(patient.tabs[1].label).toBe('Протокол 05.03.2026')
    expect(patient.tabs[1].closable).toBe(true)
    expect(patient.activeTabId).toBe('protocol-report-42')
  })

  it('не дублирует уже открытую вкладку протокола', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().addSavedProtocolTab('1', 'report-42', '05.03.2026')
    usePatientTabsStore.getState().addSavedProtocolTab('1', 'report-42', '05.03.2026')
    const patient = usePatientTabsStore.getState().openPatients[0]
    expect(patient.tabs).toHaveLength(2) // info + 1 протокол
    expect(patient.activeTabId).toBe('protocol-report-42')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/stores/patientTabsStore.test.ts`
Expected: FAIL — `addSavedProtocolTab` is not a function

- [ ] **Step 3: Implement addSavedProtocolTab + persist middleware**

В `patientTabsStore.ts`:

1. Добавить import: `import { persist } from 'zustand/middleware'`
2. Добавить метод в интерфейс `PatientTabsStore`:
```typescript
addSavedProtocolTab: (patientId: string, reportId: string, date: string) => void
```
3. Реализовать метод:
```typescript
addSavedProtocolTab: (patientId, reportId, date) => {
  const tabId = `protocol-${reportId}`
  set((s) => ({
    openPatients: s.openPatients.map((p) => {
      if (p.id !== patientId) return p
      const existing = p.tabs.find((t) => t.id === tabId)
      if (existing) return { ...p, activeTabId: tabId }
      const tab: PatientTab = {
        id: tabId,
        type: 'protocol-saved',
        label: `Протокол ${date}`,
        closable: true,
      }
      return { ...p, tabs: [...p.tabs, tab], activeTabId: tabId }
    }),
  }))
},
```
4. Обернуть store в `persist`:
```typescript
export const usePatientTabsStore = create<PatientTabsStore>()(
  persist(
    (set, get) => ({
      // ... все существующие и новый метод ...
    }),
    { name: 'rad_patient_tabs_v1', version: 1 }
  )
)
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `cd frontend && npx vitest run src/stores/patientTabsStore.test.ts`
Expected: All 7+ tests PASS (включая оба новых)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/patientTabsStore.ts frontend/src/stores/patientTabsStore.test.ts
git commit -m "feat: add persist middleware and addSavedProtocolTab to patientTabsStore"
```

---

## Chunk 2: Routing + Workspace Skeleton

### Task 2: App.tsx — добавить route /patients/:id

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/PatientWorkspacePage.tsx` (скелет)

- [ ] **Step 1: Create skeleton PatientWorkspacePage**

```typescript
// frontend/src/pages/PatientWorkspacePage.tsx
import { useParams } from 'react-router-dom'

export function PatientWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <p style={{ color: '#E2E8F0' }}>Patient workspace: {id}</p>
    </div>
  )
}
```

- [ ] **Step 2: Add route to App.tsx**

В `App.tsx`:
1. Добавить import: `import { PatientWorkspacePage } from './pages/PatientWorkspacePage'`
2. Внутри `<Route element={<AppShell />}>` после строки с `path="patients"` добавить:
```tsx
<Route path="patients/:id" element={<PatientWorkspacePage />} />
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PatientWorkspacePage.tsx frontend/src/App.tsx
git commit -m "feat: add /patients/:id route with skeleton workspace page"
```

---

### Task 3: AppShell — иерархический сайдбар

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Rewrite AppShell with hierarchical sidebar**

Полная перестройка AppShell:

1. Импорты — добавить `usePatientTabsStore`:
```typescript
import { usePatientTabsStore } from '../../stores/patientTabsStore'
```

2. Заменить `NAV_ITEMS` (строки 8–14) на:
```typescript
const MAIN_NAV = [
  { to: '/', label: 'Главная', icon: '⌂' },
  { to: '/patients', label: 'Пациенты', icon: '⊕' },
]
```

3. Внутри компонента `AppShell` достать данные из store:
```typescript
const { openPatients, activePatientId, closePatient, setActivePatient } = usePatientTabsStore()
```

4. В десктоп-сайдбаре (строки 52–75) заменить навигацию:
- Рендерить `MAIN_NAV` вместо `NAV_ITEMS`
- После item "Пациенты" (когда `item.to === '/patients'`) рендерить sub-items:
```tsx
{item.to === '/patients' && openPatients.length > 0 && (
  <div className="ml-4 flex flex-col gap-0.5">
    {openPatients.map((p) => (
      <div key={p.id} className="flex items-center group">
        <NavLink
          to={`/patients/${p.id}`}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors truncate"
          style={({ isActive }) => ({
            backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: isActive ? '#E2E8F0' : '#64748B',
          })}
        >
          <span style={{ color: '#6366F1', fontFamily: 'JetBrains Mono, monospace' }}>•</span>
          <span className="truncate">{p.pseudonym}</span>
        </NavLink>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            closePatient(p.id)
            if (activePatientId === p.id) navigate('/patients')
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-xs transition-opacity"
          style={{ color: '#64748B' }}
          title="Закрыть"
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}
```

5. В мобильной навигации (строки 92–108) использовать только `MAIN_NAV`.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat: hierarchical sidebar with patient sub-items"
```

---

### Task 4: PatientsPage — клик → openPatient + navigate

**Files:**
- Modify: `frontend/src/pages/PatientsPage.tsx`

- [ ] **Step 1: Add store integration to PatientsPage**

1. Добавить import:
```typescript
import { usePatientTabsStore } from '../stores/patientTabsStore'
```
2. Внутри компонента:
```typescript
const openPatient = usePatientTabsStore((s) => s.openPatient)
```
3. Сделать каждую карточку пациента кликабельной — обернуть `<Card>` в `<div onClick>`:
Заменить строки 180–218 (блок `{filtered.map(...)}`): добавить `onClick` на корневой `<div>` внутри `<Card>`:

```tsx
<Card key={p.id}>
  <div
    className="flex items-start justify-between gap-3 cursor-pointer"
    onClick={() => {
      openPatient(p.id, p.pseudonym)
      navigate(`/patients/${p.id}`)
    }}
  >
    {/* ... existing content ... */}
    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
      <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
        Изменить
      </Button>
      <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>
        Удалить
      </Button>
    </div>
  </div>
</Card>
```

4. Убрать кнопку "Трекер →" (строка 206–208).

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PatientsPage.tsx
git commit -m "feat: click patient to open workspace, remove tracker button"
```

---

## Chunk 3: Patient Workspace Components

### Task 5: PatientTabBar

**Files:**
- Create: `frontend/src/components/patient/PatientTabBar.tsx`

- [ ] **Step 1: Create PatientTabBar component**

```typescript
// frontend/src/components/patient/PatientTabBar.tsx
import { usePatientTabsStore, type PatientTab } from '../../stores/patientTabsStore'

interface Props {
  patientId: string
  tabs: PatientTab[]
  activeTabId: string
}

export function PatientTabBar({ patientId, tabs, activeTabId }: Props) {
  const { setActiveTab, closeTab, addProtocolTab } = usePatientTabsStore()

  return (
    <div
      className="flex items-center gap-0.5 border-b px-2 overflow-x-auto shrink-0"
      style={{ borderColor: 'rgba(99,102,241,0.15)', backgroundColor: '#0A0E1A' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(patientId, tab.id)}
            className="group flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap transition-colors shrink-0"
            style={{
              color: isActive ? '#E2E8F0' : '#64748B',
              borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
              backgroundColor: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
            }}
          >
            <span>{tab.label}</span>
            {tab.closable && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(patientId, tab.id)
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-1"
                title="Закрыть вкладку"
              >
                ×
              </span>
            )}
          </button>
        )
      })}
      <button
        onClick={() => addProtocolTab(patientId)}
        className="px-3 py-2 text-xs transition-colors shrink-0"
        style={{ color: '#64748B' }}
        title="Новый протокол"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/patient/PatientTabBar.tsx
git commit -m "feat: PatientTabBar component (VS Code-style tabs)"
```

---

### Task 6: PatientInfoTab

**Files:**
- Create: `frontend/src/components/patient/PatientInfoTab.tsx`

- [ ] **Step 1: Create PatientInfoTab component**

Компонент загружает данные пациента (`GET /api/patients/:id`) и список протоколов (`GET /api/patients/:id/reports`). Показывает:
- Данные пациента (pseudonym, birth_year, sex, notes)
- Кнопки "Изменить" / "Удалить"
- Список протоколов с кнопкой "Открыть" → `addSavedProtocolTab()`
- Кнопка "+ Новый протокол" → `addProtocolTab()`

```typescript
// frontend/src/components/patient/PatientInfoTab.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { FormField } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Tabs } from '../ui/Tabs'
import { Spinner } from '../ui/Spinner'
import { usePatientTabsStore } from '../../stores/patientTabsStore'
import api from '../../api/client'

type PatientSex = 'male' | 'female' | 'unknown'

interface Patient {
  id: string
  pseudonym: string
  birth_year: number | null
  sex: PatientSex
  notes: string | null
  created_at: string
}

interface Report {
  id: string
  modality: string
  region: string | null
  created_at: string
}

interface PatientForm {
  pseudonym: string
  birth_year: string
  sex: PatientSex
  notes: string
}

const SEX_TABS = [
  { key: 'male', label: 'Мужской' },
  { key: 'female', label: 'Женский' },
  { key: 'unknown', label: 'Не указан' },
]

const SEX_LABELS: Record<PatientSex, string> = { male: 'М', female: 'Ж', unknown: '—' }

const MODALITY_LABELS: Record<string, string> = {
  ct: 'КТ', mri: 'МРТ', xray: 'Рентген', us: 'УЗИ', mammography: 'Маммо',
}

interface Props {
  patientId: string
}

export function PatientInfoTab({ patientId }: Props) {
  const navigate = useNavigate()
  const { addProtocolTab, addSavedProtocolTab, closePatient } = usePatientTabsStore()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<PatientForm>({ pseudonym: '', birth_year: '', sex: 'unknown', notes: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        api.get<{ data: Patient }>(`/api/patients/${patientId}`),
        api.get<{ data: Report[] }>(`/api/patients/${patientId}/reports`),
      ])
      setPatient(pRes.data.data)
      setReports(rRes.data.data)
      setError('')
    } catch {
      setError('Не удалось загрузить данные пациента')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { load() }, [load])

  const openEdit = () => {
    if (!patient) return
    setForm({
      pseudonym: patient.pseudonym,
      birth_year: patient.birth_year ? String(patient.birth_year) : '',
      sex: patient.sex,
      notes: patient.notes ?? '',
    })
    setFormError('')
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!form.pseudonym.trim()) { setFormError('Псевдоним обязателен'); return }
    setSaving(true)
    setFormError('')
    try {
      await api.put(`/api/patients/${patientId}`, {
        pseudonym: form.pseudonym.trim(),
        birth_year: form.birth_year ? parseInt(form.birth_year, 10) : undefined,
        sex: form.sex,
        notes: form.notes.trim() || undefined,
      })
      setEditOpen(false)
      await load()
    } catch {
      setFormError('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/api/patients/${patientId}`)
      closePatient(patientId)
      navigate('/patients')
    } catch {
      setError('Ошибка удаления')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!patient) return <Alert variant="error">{error || 'Пациент не найден'}</Alert>

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 p-4">
      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Карточка пациента */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#E2E8F0' }}>
              {patient.pseudonym}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{SEX_LABELS[patient.sex]}</Badge>
              {patient.birth_year && (
                <span className="text-xs" style={{ color: '#64748B' }}>{patient.birth_year} г.р.</span>
              )}
            </div>
            {patient.notes && (
              <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>{patient.notes}</p>
            )}
            <p className="text-xs mt-2" style={{ color: '#475569' }}>
              Добавлен: {new Date(patient.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={openEdit}>Изменить</Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>Удалить</Button>
          </div>
        </div>
      </Card>

      {/* Протоколы */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: '#64748B' }}>Протоколы</h3>
        <Button size="sm" onClick={() => addProtocolTab(patientId)}>+ Новый протокол</Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-6" style={{ color: '#64748B' }}>
            Протоколов пока нет
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm" style={{ color: '#E2E8F0' }}>
                    {MODALITY_LABELS[r.modality] ?? r.modality.toUpperCase()}
                    {r.region ? ` — ${r.region}` : ''}
                  </span>
                  <span className="text-xs ml-3" style={{ color: '#64748B' }}>
                    {new Date(r.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addSavedProtocolTab(
                    patientId,
                    r.id,
                    new Date(r.created_at).toLocaleDateString('ru-RU'),
                  )}
                >
                  Открыть →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal редактирования */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Редактировать пациента">
        <div className="flex flex-col gap-4">
          <FormField label="Псевдоним" required error={formError && !form.pseudonym.trim() ? 'Обязательное поле' : undefined}>
            <Input
              value={form.pseudonym}
              onChange={(e) => setForm((f) => ({ ...f, pseudonym: e.target.value }))}
              placeholder="Например: Пациент А-001"
              autoFocus
            />
          </FormField>
          <FormField label="Год рождения">
            <Input
              type="number"
              value={form.birth_year}
              onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
              placeholder="1985" min="1900" max="2100"
            />
          </FormField>
          <div>
            <Label>Пол</Label>
            <Tabs
              tabs={SEX_TABS}
              active={form.sex}
              onChange={(key) => setForm((f) => ({ ...f, sex: key as PatientSex }))}
            />
          </div>
          <FormField label="Заметки">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
              rows={3}
              className="w-full rounded-lg outline-none text-sm px-3 py-2 resize-none"
              style={{
                backgroundColor: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#E2E8F0',
              }}
            />
          </FormField>
          {formError && <Alert>{formError}</Alert>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button loading={saving} onClick={handleSave}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      {/* Modal удаления */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить пациента?" size="sm">
        <p className="text-sm mb-4" style={{ color: '#64748B' }}>
          Это действие нельзя отменить. Все данные пациента будут удалены.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Отмена</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Удалить</Button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/patient/PatientInfoTab.tsx
git commit -m "feat: PatientInfoTab with patient card, protocols list, edit/delete"
```

---

### Task 7: PatientWorkspacePage — full implementation

**Files:**
- Modify: `frontend/src/pages/PatientWorkspacePage.tsx`

- [ ] **Step 1: Implement full PatientWorkspacePage**

```typescript
// frontend/src/pages/PatientWorkspacePage.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientTabsStore } from '../stores/patientTabsStore'
import { PatientTabBar } from '../components/patient/PatientTabBar'
import { PatientInfoTab } from '../components/patient/PatientInfoTab'
import { Spinner } from '../components/ui/Spinner'
import api from '../api/client'

export function PatientWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { openPatients, activePatientId, openPatient, setActivePatient } = usePatientTabsStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const exists = openPatients.find((p) => p.id === id)
    if (exists) {
      if (activePatientId !== id) setActivePatient(id)
      return
    }
    // Patient not in store — load from API and open
    setLoading(true)
    api.get<{ data: { pseudonym: string } }>(`/api/patients/${id}`)
      .then((res) => openPatient(id, res.data.data.pseudonym))
      .catch(() => navigate('/patients'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  const patient = openPatients.find((p) => p.id === id)
  if (!patient) return null

  const activeTab = patient.tabs.find((t) => t.id === patient.activeTabId)

  return (
    <div className="flex flex-col h-full">
      <PatientTabBar
        patientId={patient.id}
        tabs={patient.tabs}
        activeTabId={patient.activeTabId}
      />
      <div className="flex-1 overflow-y-auto">
        {activeTab?.type === 'info' && <PatientInfoTab patientId={patient.id} />}
        {activeTab?.type === 'protocol-new' && (
          <div className="p-4" style={{ color: '#64748B' }}>
            Новый протокол (будет реализован в Task 8)
          </div>
        )}
        {activeTab?.type === 'protocol-saved' && (
          <div className="p-4" style={{ color: '#64748B' }}>
            Сохранённый протокол (будет реализован в Task 10)
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PatientWorkspacePage.tsx
git commit -m "feat: PatientWorkspacePage with tab routing and info tab"
```

---

## Chunk 4: Protocol Tabs

### Task 8: NewProtocolTab — extract from ReportsPage

**Files:**
- Create: `frontend/src/components/patient/NewProtocolTab.tsx`
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Create NewProtocolTab**

Скопировать всю логику из `ReportsPage.tsx` (строки 1–522) в `NewProtocolTab.tsx` с изменениями:

1. Компонент принимает props:
```typescript
interface Props {
  patientId: string | null  // null = standalone mode
  tabId: string             // для promoteProtocolTab
}
```

2. При `handleSave` — если `patientId` задан, после сохранения вызвать:
```typescript
if (patientId && tabId) {
  const reportId = response.data.data.id
  const date = new Date(response.data.data.created_at).toLocaleDateString('ru-RU')
  promoteProtocolTab(patientId, tabId, reportId, date)
}
```

3. В POST-запрос добавить `patient_id`:
```typescript
await api.post('/api/reports/generate', { ...form, patient_id: patientId, lesions_json })
```

4. Экспортировать: `export function NewProtocolTab({ patientId, tabId }: Props)`

5. Перенести все вспомогательные типы, константы и sub-компоненты (`StepModality`, `StepDescription`, `StepLesions`, `StepConclusion`, `SizeField`) из ReportsPage в этот файл.

6. Убрать заголовок `<h1>Генератор заключений</h1>` и обернуть содержимое в `<div className="max-w-4xl mx-auto flex flex-col gap-4 p-4">`.

- [ ] **Step 2: Update ReportsPage to be a wrapper**

Заменить содержимое `ReportsPage.tsx`:

```typescript
import { NewProtocolTab } from '../components/patient/NewProtocolTab'

export function ReportsPage() {
  return <NewProtocolTab patientId={null} tabId="standalone" />
}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/patient/NewProtocolTab.tsx frontend/src/pages/ReportsPage.tsx
git commit -m "feat: extract NewProtocolTab from ReportsPage with patient integration"
```

---

### Task 9: CalculatorSidePanel

**Files:**
- Create: `frontend/src/components/patient/CalculatorSidePanel.tsx`
- Modify: `frontend/src/components/patient/NewProtocolTab.tsx`

- [ ] **Step 1: Create CalculatorSidePanel**

Все 4 калькулятора принимают `ResultPanel` как render prop:
```typescript
interface ResultPanelProps {
  result: CalcResult | null
  scaleType: string
  inputJson: object
}
```

`CalculatorSidePanel` переиспользует `ResultPanel` из `CalculatorPage.tsx` (строки 30–106). Нужно вынести его в отдельный файл `components/patient/CalcResultPanel.tsx`, а затем импортировать и в CalculatorSidePanel, и в CalculatorPage.

**Шаг A: Вынести ResultPanel из CalculatorPage**

Создать `frontend/src/components/patient/CalcResultPanel.tsx` — скопировать `ResultPanel` из `CalculatorPage.tsx` (строки 24–106) в отдельный экспорт:

```typescript
// frontend/src/components/patient/CalcResultPanel.tsx
import { useState, useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { RiskBadge } from '../ui/RiskBadge'
import type { CalcResult } from '../../utils/calculators'
import api from '../../api/client'

interface ResultPanelProps {
  result: CalcResult | null
  scaleType: string
  inputJson: object
}

export function CalcResultPanel({ result, scaleType, inputJson }: ResultPanelProps) {
  // ... точная копия ResultPanel из CalculatorPage.tsx (строки 30–106)
}
```

Затем в `CalculatorPage.tsx` заменить inline ResultPanel на:
```typescript
import { CalcResultPanel as ResultPanel } from '../components/patient/CalcResultPanel'
```
И удалить строки 22–106 (inline ResultPanel).

**Шаг B: Создать CalculatorSidePanel**

```typescript
// frontend/src/components/patient/CalculatorSidePanel.tsx
import { useState } from 'react'
import { Tabs } from '../ui/Tabs'
import { TiRadsCalculator } from '../calculators/TiRadsCalculator'
import { FleischnerCalculator } from '../calculators/FleischnerCalculator'
import { PiRadsCalculator } from '../calculators/PiRadsCalculator'
import { LungRadsCalculator } from '../calculators/LungRadsCalculator'
import { CalcResultPanel } from './CalcResultPanel'

const CALC_TABS = [
  { key: 'tirads', label: 'TI-RADS' },
  { key: 'fleischner', label: 'Fleischner' },
  { key: 'pirads', label: 'Pi-RADS' },
  { key: 'lungrads', label: 'Lung-RADS' },
]

export function CalculatorSidePanel() {
  const [activeCalc, setActiveCalc] = useState('tirads')

  return (
    <div
      className="w-80 border-l flex flex-col shrink-0 overflow-y-auto"
      style={{ borderColor: 'rgba(99,102,241,0.15)', backgroundColor: '#0F172A' }}
    >
      <div className="p-3 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>
          Калькулятор шкал
        </h3>
        <Tabs tabs={CALC_TABS} active={activeCalc} onChange={setActiveCalc} />
      </div>
      <div className="p-3 flex-1 overflow-y-auto">
        {activeCalc === 'tirads' && <TiRadsCalculator ResultPanel={CalcResultPanel} />}
        {activeCalc === 'fleischner' && <FleischnerCalculator ResultPanel={CalcResultPanel} />}
        {activeCalc === 'pirads' && <PiRadsCalculator ResultPanel={CalcResultPanel} />}
        {activeCalc === 'lungrads' && <LungRadsCalculator ResultPanel={CalcResultPanel} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add calculator toggle to NewProtocolTab**

В `NewProtocolTab.tsx`:
1. Добавить state: `const [calcOpen, setCalcOpen] = useState(false)`
2. Добавить import: `import { CalculatorSidePanel } from './CalculatorSidePanel'`
3. Обернуть grid layout: основную форму + превью в `<div className="flex-1">`, а рядом при `calcOpen`:
```tsx
<div className="flex h-full">
  <div className="flex-1 overflow-y-auto p-4">
    {/* existing wizard content */}
  </div>
  {calcOpen && <CalculatorSidePanel />}
</div>
```
4. Добавить кнопку-тоггл рядом с кнопками "Копировать"/"Сохранить":
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setCalcOpen((v) => !v)}
  style={{ color: calcOpen ? '#6366F1' : '#64748B' }}
>
  {calcOpen ? '✕ Калькулятор' : '◈ Калькулятор'}
</Button>
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/patient/CalculatorSidePanel.tsx frontend/src/components/patient/NewProtocolTab.tsx
git commit -m "feat: CalculatorSidePanel toggleable from NewProtocolTab"
```

---

### Task 10: SavedProtocolTab

**Files:**
- Create: `frontend/src/components/patient/SavedProtocolTab.tsx`

- [ ] **Step 1: Create SavedProtocolTab**

```typescript
// frontend/src/components/patient/SavedProtocolTab.tsx
import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import api from '../../api/client'

interface ReportData {
  id: string
  modality: string
  region: string | null
  description: string
  conclusion: string
  content: string
  created_at: string
}

interface Props {
  reportId: string  // tabId = 'protocol-<reportId>', нужно извлечь reportId
}

export function SavedProtocolTab({ reportId }: Props) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get<{ data: ReportData }>(`/api/reports/${reportId}`)
      .then((res) => setReport(res.data.data))
      .catch(() => setError('Не удалось загрузить протокол'))
      .finally(() => setLoading(false))
  }, [reportId])

  const handleCopy = async () => {
    if (!report) return
    await navigator.clipboard.writeText(report.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (error) return <div className="p-4"><Alert variant="error">{error}</Alert></div>
  if (!report) return null

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>
              {new Date(report.created_at).toLocaleDateString('ru-RU')}
            </span>
            <span className="text-xs ml-2" style={{ color: '#64748B' }}>
              {report.modality.toUpperCase()}
              {report.region ? ` — ${report.region}` : ''}
            </span>
          </div>
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
        </div>
        <pre
          className="text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: '#E2E8F0', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {report.content}
        </pre>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Wire SavedProtocolTab into PatientWorkspacePage**

В `PatientWorkspacePage.tsx`:
1. Добавить import: `import { SavedProtocolTab } from '../components/patient/SavedProtocolTab'`
2. Добавить import: `import { NewProtocolTab } from '../components/patient/NewProtocolTab'`
3. Заменить placeholder-блоки:
```tsx
{activeTab?.type === 'protocol-new' && (
  <NewProtocolTab patientId={patient.id} tabId={activeTab.id} />
)}
{activeTab?.type === 'protocol-saved' && (
  <SavedProtocolTab reportId={activeTab.id.replace('protocol-', '')} />
)}
```

- [ ] **Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/patient/SavedProtocolTab.tsx frontend/src/pages/PatientWorkspacePage.tsx
git commit -m "feat: SavedProtocolTab + wire all tab types in workspace"
```

---

## Chunk 5: Cleanup

### Task 11: DashboardPage — обновить quick actions

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Update QUICK_ACTIONS**

В `DashboardPage.tsx` строки 46–54, заменить `QUICK_ACTIONS`:

```typescript
const QUICK_ACTIONS = [
  { href: '/patients', icon: '⊕', title: 'Пациенты' },
  { href: '/calculator/tirads', icon: '◉', title: 'TI-RADS' },
  { href: '/calculator/fleischner', icon: '◈', title: 'Fleischner' },
  { href: '/calculator/pirads', icon: '◧', title: 'Pi-RADS' },
  { href: '/calculator/lungrads', icon: '◫', title: 'Lung-RADS' },
]
```

Убраны: Трекер, Заключения.

- [ ] **Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: update dashboard quick actions, remove tracker/reports"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run full build**

Run: `cd frontend && npm run build`
Expected: No errors, clean build

- [ ] **Step 2: Run all tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Final commit (if any uncommitted changes)**

```bash
git status
# if changes exist:
git add -A
git commit -m "chore: final cleanup for patient workspace architecture"
```
