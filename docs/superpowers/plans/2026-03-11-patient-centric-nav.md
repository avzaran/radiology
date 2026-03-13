# Patient-Centric Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать навигацию RadAssist PRO с плоского меню на пациент-центричный интерфейс в стиле VS Code с динамическими подпунктами в сайдбаре и горизонтальными вкладками.

**Architecture:** Zustand store (`patientTabsStore`) управляет списком открытых пациентов и их вкладками. AppShell читает store и рендерит подпункты под «Пациенты». При выборе пациента открывается `PatientWorkspace` с TabBar и сменными вкладками (Информация / Протоколы / Калькулятор-drawer).

**Tech Stack:** React 18, TypeScript, Zustand, React Router v6, Lucide React, DM Sans (Google Fonts), Vitest + @testing-library/react

---

## Chunk 1: Foundation — шрифт, иконки, тесты, store

### Task 1: Установить зависимости

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Установить lucide-react и vitest**

```bash
cd frontend
npm install lucide-react
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Проверить установку**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -5
```

Expected: нет новых ошибок, связанных с пакетами.

---

### Task 2: Настроить Vitest

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Добавить vitest config в vite.config.ts**

Найти секцию `plugins` в `frontend/vite.config.ts` и добавить блок `test` в конфиг:

```ts
/// <reference types="vitest" />
// добавить в defineConfig:
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
},
```

- [ ] **Step 2: Создать setup файл**

```ts
// frontend/src/test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Добавить скрипты в package.json**

В блок `"scripts"` добавить:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Запустить тесты (ожидаем 0 тестов, нет ошибок)**

```bash
cd frontend && npm test 2>&1 | tail -5
```

Expected: `No test files found` или `0 passed`.

---

### Task 3: Заменить шрифт Inter → DM Sans

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Заменить @fontsource/inter на Google Fonts DM Sans**

В `frontend/src/index.css` заменить строки:
```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
@import '@fontsource/jetbrains-mono/300.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/700.css';
```
на:
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
```

- [ ] **Step 2: Заменить font-family в @theme**

```css
--font-family-sans: 'DM Sans', 'Segoe UI', sans-serif;
--font-family-mono: 'DM Sans', 'Segoe UI', monospace;
```

- [ ] **Step 3: Проверить сборку**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ built in` без ошибок.

---

### Task 4: Создать patientTabsStore

**Files:**
- Create: `frontend/src/stores/patientTabsStore.ts`
- Create: `frontend/src/stores/patientTabsStore.test.ts`

- [ ] **Step 1: Написать тесты на store**

```ts
// frontend/src/stores/patientTabsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePatientTabsStore } from './patientTabsStore'

beforeEach(() => {
  usePatientTabsStore.setState({
    openPatients: [],
    activePatientId: null,
  })
})

describe('openPatient', () => {
  it('добавляет нового пациента с вкладкой info', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    const { openPatients, activePatientId } = usePatientTabsStore.getState()
    expect(openPatients).toHaveLength(1)
    expect(openPatients[0].pseudonym).toBe('Иванов И.И.')
    expect(openPatients[0].tabs[0].id).toBe('info')
    expect(openPatients[0].activeTabId).toBe('info')
    expect(activePatientId).toBe('1')
  })

  it('не дублирует пациента при повторном вызове', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    expect(usePatientTabsStore.getState().openPatients).toHaveLength(1)
  })

  it('переключает на уже открытого пациента', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().openPatient('2', 'Петрова А.С.')
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    expect(usePatientTabsStore.getState().activePatientId).toBe('1')
  })
})

describe('closePatient', () => {
  it('удаляет пациента из списка', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().closePatient('1')
    expect(usePatientTabsStore.getState().openPatients).toHaveLength(0)
    expect(usePatientTabsStore.getState().activePatientId).toBeNull()
  })

  it('переключает activePatientId на другого при закрытии активного', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().openPatient('2', 'Петрова А.С.')
    usePatientTabsStore.getState().closePatient('2')
    expect(usePatientTabsStore.getState().activePatientId).toBe('1')
  })
})

describe('addProtocolTab', () => {
  it('добавляет вкладку protocol-new', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().addProtocolTab('1')
    const patient = usePatientTabsStore.getState().openPatients[0]
    expect(patient.tabs).toHaveLength(2)
    expect(patient.tabs[1].type).toBe('protocol-new')
    expect(patient.tabs[1].closable).toBe(true)
    expect(patient.activeTabId).toBe(patient.tabs[1].id)
  })
})

describe('closeTab', () => {
  it('закрывает вкладку протокола и переключает на info', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().addProtocolTab('1')
    const tabId = usePatientTabsStore.getState().openPatients[0].tabs[1].id
    usePatientTabsStore.getState().closeTab('1', tabId)
    const patient = usePatientTabsStore.getState().openPatients[0]
    expect(patient.tabs).toHaveLength(1)
    expect(patient.activeTabId).toBe('info')
  })

  it('не закрывает вкладку info', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().closeTab('1', 'info')
    expect(usePatientTabsStore.getState().openPatients[0].tabs).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться что падают**

```bash
cd frontend && npm test 2>&1 | grep -E 'FAIL|Cannot find|pass|fail'
```

Expected: ошибки импорта `patientTabsStore`.

- [ ] **Step 3: Создать patientTabsStore.ts**

```ts
// frontend/src/stores/patientTabsStore.ts
import { create } from 'zustand'

export type TabType = 'info' | 'protocol-new' | 'protocol-saved'

export interface PatientTab {
  id: string
  type: TabType
  label: string
  closable: boolean
}

export interface OpenPatient {
  id: string
  pseudonym: string
  activeTabId: string
  tabs: PatientTab[]
}

interface PatientTabsStore {
  openPatients: OpenPatient[]
  activePatientId: string | null
  openPatient: (id: string, pseudonym: string) => void
  closePatient: (id: string) => void
  setActivePatient: (id: string) => void
  addProtocolTab: (patientId: string) => void
  closeTab: (patientId: string, tabId: string) => void
  setActiveTab: (patientId: string, tabId: string) => void
  promoteProtocolTab: (patientId: string, tempTabId: string, reportId: string, date: string) => void
}

const INFO_TAB: PatientTab = { id: 'info', type: 'info', label: 'Информация', closable: false }

// TODO: upgrade to persist — add persist middleware from zustand/middleware
// import { persist } from 'zustand/middleware'
// export const usePatientTabsStore = create(persist(storeImpl, { name: 'rad-patient-tabs', version: 1 }))

export const usePatientTabsStore = create<PatientTabsStore>((set, get) => ({
  openPatients: [],
  activePatientId: null,

  openPatient: (id, pseudonym) => {
    const existing = get().openPatients.find((p) => p.id === id)
    if (existing) {
      set({ activePatientId: id })
      return
    }
    const newPatient: OpenPatient = {
      id,
      pseudonym,
      activeTabId: 'info',
      tabs: [INFO_TAB],
    }
    set((s) => ({ openPatients: [...s.openPatients, newPatient], activePatientId: id }))
  },

  closePatient: (id) => {
    set((s) => {
      const remaining = s.openPatients.filter((p) => p.id !== id)
      const newActive =
        s.activePatientId === id
          ? (remaining[remaining.length - 1]?.id ?? null)
          : s.activePatientId
      return { openPatients: remaining, activePatientId: newActive }
    })
  },

  setActivePatient: (id) => set({ activePatientId: id }),

  addProtocolTab: (patientId) => {
    const tabId = `protocol-${crypto.randomUUID()}`
    const tab: PatientTab = {
      id: tabId,
      type: 'protocol-new',
      label: 'Новый протокол',
      closable: true,
    }
    set((s) => ({
      openPatients: s.openPatients.map((p) =>
        p.id === patientId
          ? { ...p, tabs: [...p.tabs, tab], activeTabId: tabId }
          : p,
      ),
    }))
  },

  closeTab: (patientId, tabId) => {
    set((s) => ({
      openPatients: s.openPatients.map((p) => {
        if (p.id !== patientId) return p
        const tab = p.tabs.find((t) => t.id === tabId)
        if (!tab || !tab.closable) return p
        const remaining = p.tabs.filter((t) => t.id !== tabId)
        const newActive =
          p.activeTabId === tabId
            ? (remaining[remaining.length - 1]?.id ?? 'info')
            : p.activeTabId
        return { ...p, tabs: remaining, activeTabId: newActive }
      }),
    }))
  },

  setActiveTab: (patientId, tabId) => {
    set((s) => ({
      openPatients: s.openPatients.map((p) =>
        p.id === patientId ? { ...p, activeTabId: tabId } : p,
      ),
    }))
  },

  promoteProtocolTab: (patientId, tempTabId, reportId, date) => {
    set((s) => ({
      openPatients: s.openPatients.map((p) => {
        if (p.id !== patientId) return p
        return {
          ...p,
          tabs: p.tabs.map((t) =>
            t.id === tempTabId
              ? { ...t, id: `protocol-${reportId}`, type: 'protocol-saved' as TabType, label: `Протокол ${date}` }
              : t,
          ),
          activeTabId: p.activeTabId === tempTabId ? `protocol-${reportId}` : p.activeTabId,
        }
      }),
    }))
  },
}))
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd frontend && npm test 2>&1 | tail -15
```

Expected: все тесты `patientTabsStore.test.ts` зелёные.

- [ ] **Step 5: Проверить сборку**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Коммит**

```bash
git add frontend/src/stores/patientTabsStore.ts frontend/src/stores/patientTabsStore.test.ts frontend/src/test/setup.ts frontend/vite.config.ts frontend/package.json frontend/src/index.css
git commit -m "feat: patientTabsStore + vitest setup + DM Sans font"
```

---

## Chunk 2: AppShell — новая навигация

### Task 5: Рефакторинг AppShell

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Заменить AppShell.tsx полностью**

```tsx
// frontend/src/components/layout/AppShell.tsx
import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, User, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { usePatientTabsStore } from '../../stores/patientTabsStore'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'

export function AppShell() {
  const { isAuthenticated, logout, user } = useAuthStore()
  const { isOnline, setOnline } = useUIStore()
  const { openPatients, activePatientId, closePatient, setActivePatient } = usePatientTabsStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  const handlePatientClick = (id: string) => {
    setActivePatient(id)
    navigate(`/patients/${id}`)
  }

  const handleClosePatient = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    closePatient(id)
    if (activePatientId === id) {
      navigate('/patients')
    }
  }

  const isOnPatientsSection = location.pathname.startsWith('/patients')

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0A0E1A', color: '#E2E8F0' }}>
      {/* Боковая панель — десктоп */}
      <aside
        className="hidden lg:flex flex-col shrink-0"
        style={{ width: '224px', backgroundColor: '#0F172A', borderRight: '1px solid rgba(99,102,241,0.15)' }}
      >
        {/* Логотип */}
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <span className="font-semibold text-sm tracking-tight" style={{ color: '#E2E8F0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
            RadAssist
          </span>
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#6366F1', color: '#fff', letterSpacing: '0.05em' }}
          >
            PRO
          </span>
          <div className="ml-auto text-xs truncate max-w-[80px]" style={{ color: '#64748B' }}>
            {user?.email ?? ''}
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {/* Главная */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'text-white' : 'hover:text-white'
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: isActive ? '#E2E8F0' : '#64748B',
              borderLeft: isActive ? '2px solid #6366F1' : '2px solid transparent',
            })}
          >
            <Home size={15} strokeWidth={1.8} />
            <span>Главная</span>
          </NavLink>

          {/* Пациенты */}
          <NavLink
            to="/patients"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isOnPatientsSection ? 'text-white' : 'hover:text-white'
              }`
            }
            style={() => ({
              backgroundColor: isOnPatientsSection ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: isOnPatientsSection ? '#E2E8F0' : '#64748B',
              borderLeft: isOnPatientsSection ? '2px solid #6366F1' : '2px solid transparent',
            })}
          >
            <Users size={15} strokeWidth={1.8} />
            <span>Пациенты</span>
          </NavLink>

          {/* Подпункты открытых пациентов */}
          {openPatients.map((p) => {
            const isActive = activePatientId === p.id && location.pathname === `/patients/${p.id}`
            return (
              <div
                key={p.id}
                onClick={() => handlePatientClick(p.id)}
                className="group flex items-center gap-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  paddingLeft: '28px',
                  paddingRight: '8px',
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  backgroundColor: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                  color: isActive ? '#C7D2FE' : '#4B5563',
                  borderLeft: isActive ? '2px solid rgba(99,102,241,0.5)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = '#94A3B8'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = '#4B5563'
                }}
              >
                <User size={12} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <span className="text-xs truncate flex-1">{p.pseudonym}</span>
                <button
                  onClick={(e) => handleClosePatient(e, p.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5"
                  style={{ color: '#64748B' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#E2E8F0')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748B')}
                  title="Закрыть"
                >
                  <X size={11} />
                </button>
              </div>
            )
          })}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
          {!isOnline && (
            <Alert variant="warning" className="mb-2 justify-center">
              Офлайн-режим
            </Alert>
          )}
          <Button variant="ghost" size="sm" fullWidth onClick={logout}>
            Выйти
          </Button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Нижняя навигация — мобайл */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t z-50"
          style={{ backgroundColor: '#0F172A', borderColor: 'rgba(99,102,241,0.15)' }}
        >
          <NavLink
            to="/"
            end
            className="flex-1 flex flex-col items-center py-2 gap-1"
            style={({ isActive }) => ({ color: isActive ? '#6366F1' : '#64748B' })}
          >
            <Home size={20} strokeWidth={1.8} />
            <span className="text-xs">Главная</span>
          </NavLink>
          <NavLink
            to="/patients"
            className="flex-1 flex flex-col items-center py-2 gap-1"
            style={() => ({ color: isOnPatientsSection ? '#6366F1' : '#64748B' })}
          >
            <Users size={20} strokeWidth={1.8} />
            <span className="text-xs">Пациенты</span>
          </NavLink>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Проверить сборку**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: нет ошибок TypeScript.

- [ ] **Step 3: Коммит**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat: AppShell refactor — 2-item nav + patient sub-items + Lucide icons"
```

---

## Chunk 3: PatientsPage + App.tsx routing

### Task 6: Обновить PatientsPage

**Files:**
- Modify: `frontend/src/pages/PatientsPage.tsx`

- [ ] **Step 1: Добавить вызов openPatient при клике на пациента**

В `PatientsPage.tsx`:

1. Добавить импорт store: `import { usePatientTabsStore } from '../stores/patientTabsStore'`
2. Добавить в тело компонента: `const { openPatient } = usePatientTabsStore()`
3. Заменить существующую кнопку «Трекер →» на кнопку «Открыть»:

Найти блок с кнопками пациента:
```tsx
<div className="flex gap-2 shrink-0">
  <Button variant="ghost" size="sm" onClick={() => navigate(`/tracker/${p.id}`)}>
    Трекер →
  </Button>
  <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
    Изменить
  </Button>
  <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>
    Удалить
  </Button>
</div>
```

Заменить на:
```tsx
<div className="flex gap-2 shrink-0">
  <Button
    size="sm"
    onClick={() => {
      openPatient(p.id, p.pseudonym)
      navigate(`/patients/${p.id}`)
    }}
  >
    Открыть
  </Button>
  <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
    Изменить
  </Button>
  <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>
    Удалить
  </Button>
</div>
```

4. Добавить кликабельность всей строки пациента (не только кнопки): добавить `cursor-pointer` и `onClick` на карточку:

В `<Card key={p.id}>` добавить:
```tsx
<Card key={p.id} style={{ cursor: 'pointer' }} onClick={() => { openPatient(p.id, p.pseudonym); navigate(`/patients/${p.id}`) }}>
```

И на кнопки добавить `e.stopPropagation()`:
```tsx
<Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p) }}>
<Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(p.id) }}>
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: нет ошибок в PatientsPage.

- [ ] **Step 3: Коммит**

```bash
git add frontend/src/pages/PatientsPage.tsx
git commit -m "feat: PatientsPage — open patient on click, remove tracker button"
```

---

### Task 6.5: Очистить DashboardPage от удалённых маршрутов

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Обновить QUICK_ACTIONS — убрать ссылки на удалённые маршруты**

В `DashboardPage.tsx` найти массив `QUICK_ACTIONS` (около строки 47):
```ts
const QUICK_ACTIONS = [
  { href: '/calculator/tirads',     icon: '◉', title: 'TI-RADS' },
  { href: '/calculator/fleischner', icon: '◈', title: 'Fleischner' },
  { href: '/calculator/pirads',     icon: '◧', title: 'Pi-RADS' },
  { href: '/calculator/lungrads',   icon: '◫', title: 'Lung-RADS' },
  { href: '/patients',              icon: '⊕', title: 'Пациенты' },
  { href: '/tracker',               icon: '◎', title: 'Трекер' },
  { href: '/reports',               icon: '◰', title: 'Заключения' },
]
```

Заменить на:
```ts
const QUICK_ACTIONS = [
  { href: '/patients', icon: 'patients', title: 'Пациенты' },
]
```

- [ ] **Step 2: Убрать кнопку "Все протоколы" и ссылку на /reports**

Найти `to="/reports"` в DashboardPage и убрать эту ссылку/кнопку (раздел «Последние протоколы» оставить, только убрать кнопку «Все →» если она ведёт на `/reports`).

- [ ] **Step 3: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep DashboardPage
```

Expected: нет ошибок.

---

### Task 7: Обновить App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Заменить содержимое App.tsx**

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PatientsPage } from './pages/PatientsPage'
import { PatientWorkspace } from './pages/PatientWorkspace'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientWorkspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Проверить сборку**

```bash
cd frontend && npm run build 2>&1 | grep -E 'error|Error|✓'
```

Expected: ошибка на отсутствующий `PatientWorkspace` — это нормально, следующий таск.

- [ ] **Step 3: Коммит (после создания PatientWorkspace)**

Коммит будет в Task 8.

---

## Chunk 4: PatientWorkspace + TabBar

### Task 8: Создать TabBar

**Files:**
- Create: `frontend/src/components/patient/TabBar.tsx`

- [ ] **Step 1: Создать компонент TabBar**

```tsx
// frontend/src/components/patient/TabBar.tsx
import { X, Plus } from 'lucide-react'
import type { PatientTab } from '../../stores/patientTabsStore'

interface TabBarProps {
  tabs: PatientTab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAddProtocol: () => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onAddProtocol }: TabBarProps) {
  return (
    <div
      className="flex items-end gap-0 overflow-x-auto shrink-0"
      style={{
        backgroundColor: '#0A0E1A',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
        minHeight: '40px',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className="group flex items-center gap-2 px-4 text-xs whitespace-nowrap transition-colors relative shrink-0"
            style={{
              height: '40px',
              backgroundColor: isActive ? '#0F172A' : 'transparent',
              color: isActive ? '#E2E8F0' : '#64748B',
              borderRight: '1px solid rgba(99,102,241,0.1)',
              borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
              fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            }}
          >
            <span className="font-medium">{tab.label}</span>
            {tab.closable && (
              <span
                onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-white/10"
                style={{ color: '#64748B' }}
                title="Закрыть вкладку"
              >
                <X size={11} />
              </span>
            )}
          </button>
        )
      })}

      {/* Кнопка добавить протокол */}
      <button
        onClick={onAddProtocol}
        className="flex items-center justify-center px-3 transition-colors hover:text-white shrink-0"
        style={{ height: '40px', color: '#475569' }}
        title="Новый протокол"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
```

---

### Task 9: Создать PatientWorkspace

**Files:**
- Create: `frontend/src/pages/PatientWorkspace.tsx`

- [ ] **Step 1: Создать PatientWorkspace.tsx**

```tsx
// frontend/src/pages/PatientWorkspace.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientTabsStore } from '../stores/patientTabsStore'
import { TabBar } from '../components/patient/TabBar'
import { PatientInfoTab } from '../components/patient/PatientInfoTab'
import { ProtocolEditorTab } from '../components/patient/ProtocolEditorTab'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import api from '../api/client'

export function PatientWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { openPatients, activePatientId, openPatient, setActivePatient, addProtocolTab, closeTab, setActiveTab } =
    usePatientTabsStore()

  const [bootstrapping, setBootstrapping] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Bootstrap: если пациент не в store — загрузить из API
  useEffect(() => {
    if (!id) return
    const exists = openPatients.find((p) => p.id === id)
    if (exists) {
      setActivePatient(id)
      return
    }
    setBootstrapping(true)
    api
      .get<{ data: { id: string; pseudonym: string } }>(`/api/patients/${id}`)
      .then(({ data }) => {
        openPatient(data.data.id, data.data.pseudonym)
      })
      .catch(() => setNotFound(true))
      .finally(() => setBootstrapping(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Alert variant="error">Пациент не найден</Alert>
        <button
          className="mt-4 text-sm underline"
          style={{ color: '#6366F1' }}
          onClick={() => navigate('/patients')}
        >
          ← Вернуться к списку
        </button>
      </div>
    )
  }

  if (bootstrapping) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
      </div>
    )
  }

  const patient = openPatients.find((p) => p.id === id)
  if (!patient) return null

  const activeTab = patient.tabs.find((t) => t.id === patient.activeTabId)

  return (
    <div className="flex flex-col h-full -m-4">
      <TabBar
        tabs={patient.tabs}
        activeTabId={patient.activeTabId}
        onSelect={(tabId) => setActiveTab(patient.id, tabId)}
        onClose={(tabId) => closeTab(patient.id, tabId)}
        onAddProtocol={() => addProtocolTab(patient.id)}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab?.type === 'info' && <PatientInfoTab patientId={patient.id} />}
        {(activeTab?.type === 'protocol-new' || activeTab?.type === 'protocol-saved') && (
          <ProtocolEditorTab
            patientId={patient.id}
            tabId={activeTab.id}
            readOnly={activeTab.type === 'protocol-saved'}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Проверить TypeScript (ожидаем ошибки на PatientInfoTab и ProtocolEditorTab — создадим ниже)**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v 'Cannot find module' | head -20
```

---

## Chunk 5: PatientInfoTab

### Task 10: Создать PatientInfoTab

**Files:**
- Create: `frontend/src/components/patient/PatientInfoTab.tsx`

- [ ] **Step 1: Создать PatientInfoTab.tsx**

```tsx
// frontend/src/components/patient/PatientInfoTab.tsx
import { useState, useEffect } from 'react'
import { usePatientTabsStore } from '../../stores/patientTabsStore'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { FormField } from '../ui/FormField'
import { Tabs } from '../ui/Tabs'
import api from '../../api/client'

type PatientSex = 'male' | 'female' | 'unknown'

interface Patient {
  id: string
  pseudonym: string
  birth_year: number | null
  sex: PatientSex
  notes: string | null
}

interface Report {
  id: string
  modality: string
  created_at: string
  conclusion: string
}

const SEX_LABELS: Record<PatientSex, string> = { male: 'М', female: 'Ж', unknown: '—' }
const SEX_TABS = [
  { key: 'male', label: 'Мужской' },
  { key: 'female', label: 'Женский' },
  { key: 'unknown', label: 'Не указан' },
]

const MODALITY_LABELS: Record<string, string> = {
  ct: 'КТ', mri: 'МРТ', xray: 'Рентген', us: 'УЗИ', mammography: 'Маммография',
}

export function PatientInfoTab({ patientId }: { patientId: string }) {
  const { addProtocolTab } = usePatientTabsStore()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ pseudonym: '', birth_year: '', sex: 'unknown' as PatientSex, notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        api.get<{ data: Patient }>(`/api/patients/${patientId}`),
        api.get<{ data: Report[] }>(`/api/patients/${patientId}/reports`),
      ])
      setPatient(pRes.data.data)
      setReports(rRes.data.data ?? [])
      setError('')
    } catch {
      setError('Не удалось загрузить данные пациента')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = () => {
    if (!patient) return
    setForm({
      pseudonym: patient.pseudonym,
      birth_year: patient.birth_year ? String(patient.birth_year) : '',
      sex: patient.sex,
      notes: patient.notes ?? '',
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!form.pseudonym.trim()) return
    setSaving(true)
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
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>
  }

  if (!patient) return null

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      {/* Карточка пациента */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base" style={{ color: '#E2E8F0' }}>
                {patient.pseudonym}
              </span>
              <Badge variant={patient.sex === 'male' ? 'default' : patient.sex === 'female' ? 'warning' : 'default'}>
                {SEX_LABELS[patient.sex]}
              </Badge>
              {patient.birth_year && (
                <span className="text-sm" style={{ color: '#64748B' }}>
                  {patient.birth_year} г.р.
                </span>
              )}
            </div>
            {patient.notes && (
              <p className="text-sm" style={{ color: '#94A3B8' }}>{patient.notes}</p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            Редактировать
          </Button>
        </div>
      </Card>

      {/* Протоколы */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#475569', letterSpacing: '0.08em' }}>
          Протоколы
        </h2>
        <Button size="sm" onClick={() => addProtocolTab(patientId)}>
          + Новый протокол
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-sm" style={{ color: '#475569' }}>
            Протоколов пока нет
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 px-2 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818CF8' }}
                >
                  {MODALITY_LABELS[r.modality] ?? r.modality}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs mb-1" style={{ color: '#64748B' }}>
                    {new Date(r.created_at).toLocaleDateString('ru-RU', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </div>
                  {r.conclusion && (
                    <p className="text-sm line-clamp-2" style={{ color: '#94A3B8' }}>
                      {r.conclusion.slice(0, 120)}{r.conclusion.length > 120 ? '…' : ''}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Модалка редактирования */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Редактировать пациента">
        <div className="flex flex-col gap-4">
          <FormField label="Псевдоним" required>
            <Input
              value={form.pseudonym}
              onChange={(e) => setForm((f) => ({ ...f, pseudonym: e.target.value }))}
              autoFocus
            />
          </FormField>
          <FormField label="Год рождения">
            <Input
              type="number"
              value={form.birth_year}
              onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
              placeholder="1985"
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
              rows={3}
              className="w-full rounded-lg outline-none text-sm px-3 py-2 resize-none"
              style={{
                backgroundColor: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#E2E8F0',
              }}
            />
          </FormField>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button loading={saving} onClick={handleSave}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

---

## Chunk 6: ProtocolEditorTab + CalculatorDrawer

### Task 10.5: Обновить SmartTextarea — forwardRef + disabled

**Files:**
- Modify: `frontend/src/components/ui/SmartTextarea.tsx`

- [ ] **Step 1: Добавить `forwardRef` и проп `disabled`**

Текущий интерфейс `SmartTextareaProps`:
```ts
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
```

Изменить на:
```ts
interface SmartTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  section: 'description' | 'conclusion'
  modality: string
  region: string
  templates: Template[]
  disabled?: boolean
}
```

Обернуть компонент в `forwardRef`:
```ts
// Изменить импорт:
import { useState, useEffect, useRef, useCallback, forwardRef } from 'react'

// Изменить объявление компонента:
export const SmartTextarea = forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  function SmartTextarea(
    { value, onChange, placeholder, rows = 8, section, modality, region, templates, disabled },
    ref,
  ) {
    // ... весь существующий код компонента без изменений ...
    // Единственное изменение: в JSX добавить ref и disabled на <textarea>:
    // <textarea ref={ref} disabled={disabled} ... >
```

Найти внутренний `textareaRef` — он остаётся для внутреннего использования (курсор, фокус). `ref` (внешний) пробрасывается через `forwardRef` на тот же `<textarea>`. Использовать `useImperativeHandle` не нужно — просто объединить через `mergeRefs` или добавить `ref` напрямую если `textareaRef` не используется снаружи. Простейший способ:

```tsx
// Внутри компонента оставить внутренний ref:
const textareaRef = useRef<HTMLTextAreaElement>(null)

// На теге <textarea> использовать оба:
<textarea
  ref={(el) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
  }}
  disabled={disabled}
  // ... остальные пропы без изменений
/>
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep SmartTextarea
```

Expected: нет ошибок.

---

### Task 11: Создать CalculatorDrawer

**Files:**
- Create: `frontend/src/components/patient/CalculatorDrawer.tsx`

- [ ] **Step 1: Создать CalculatorDrawer.tsx**

```tsx
// frontend/src/components/patient/CalculatorDrawer.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { TiRadsCalculator } from '../calculators/TiRadsCalculator'
import { FleischnerCalculator } from '../calculators/FleischnerCalculator'
import { PiRadsCalculator } from '../calculators/PiRadsCalculator'
import { LungRadsCalculator } from '../calculators/LungRadsCalculator'

interface CalculatorDrawerProps {
  open: boolean
  onClose: () => void
  onInsert: (text: string) => void
}

const CALC_TABS = [
  { key: 'tirads', label: 'TI-RADS' },
  { key: 'fleischner', label: 'Fleischner' },
  { key: 'pirads', label: 'PI-RADS' },
  { key: 'lungrads', label: 'Lung-RADS' },
]

export function CalculatorDrawer({ open, onClose, onInsert }: CalculatorDrawerProps) {
  const [activeCalc, setActiveCalc] = useState('tirads')

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: '360px',
          backgroundColor: '#0F172A',
          borderLeft: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>
            Калькуляторы
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:bg-white/10"
            style={{ color: '#64748B' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}
        >
          {CALC_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveCalc(t.key)}
              className="px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                color: activeCalc === t.key ? '#6366F1' : '#64748B',
                borderBottom: activeCalc === t.key ? '2px solid #6366F1' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Calculator content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeCalc === 'tirads' && <TiRadsCalculator onInsert={onInsert} />}
          {activeCalc === 'fleischner' && <FleischnerCalculator onInsert={onInsert} />}
          {activeCalc === 'pirads' && <PiRadsCalculator onInsert={onInsert} />}
          {activeCalc === 'lungrads' && <LungRadsCalculator onInsert={onInsert} />}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Добавить проп `onInsert` в калькуляторы**

Каждый из 4 компонентов-калькуляторов нужно обновить, добавив необязательный проп `onInsert?: (text: string) => void` и кнопку «Вставить в протокол» после получения результата.

Для `TiRadsCalculator` — найти место где рендерится результат и добавить:
```tsx
// В пропы компонента:
interface TiRadsCalculatorProps {
  onInsert?: (text: string) => void
}

// После вывода результата:
{onInsert && result && (
  <Button size="sm" variant="secondary" onClick={() => onInsert(resultText)}>
    Вставить в протокол
  </Button>
)}
```

Аналогично для Fleischner, PiRads, LungRads.

Конкретный текст для вставки — строка с названием шкалы и результатом, например:
`"TI-RADS: категория 4, 7 баллов. Рекомендация: ФНА при узле ≥ 15 мм."`

---

### Task 12: Создать ProtocolEditorTab

**Files:**
- Create: `frontend/src/components/patient/ProtocolEditorTab.tsx`

- [ ] **Step 1: Создать ProtocolEditorTab.tsx**

Адаптировать `ReportsPage.tsx` в компонент вкладки. Основные изменения:
- Принимает `patientId`, `tabId`, `readOnly` как пропы
- При `readOnly=true` — поля задизейблены, кнопка сохранения не показывается
- При сохранении вызывает `usePatientTabsStore().promoteProtocolTab(patientId, tabId, reportId, date)`
- Добавляет кнопку «Калькуляторы» в toolbar, открывающую `CalculatorDrawer`
- `onInsert` из CalculatorDrawer вставляет текст в поле `conclusion` (в позицию курсора или в конец)

```tsx
// frontend/src/components/patient/ProtocolEditorTab.tsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { Settings2 } from 'lucide-react'
import { usePatientTabsStore } from '../../stores/patientTabsStore'
import { CalculatorDrawer } from './CalculatorDrawer'
import { Card } from '../ui/Card'
import { SmartTextarea } from '../ui/SmartTextarea'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Label } from '../ui/Label'
import { Tabs } from '../ui/Tabs'
import { Alert } from '../ui/Alert'
import { calcVolume } from '../../utils/calc'
import { type Template } from '../../utils/templateEngine'
import api from '../../api/client'

// ─── Типы и константы (из ReportsPage) ───────────────────────
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

const MODALITIES: { value: Modality; label: string }[] = [
  { value: 'ct', label: 'КТ' },
  { value: 'mri', label: 'МРТ' },
  { value: 'xray', label: 'Рентген' },
  { value: 'us', label: 'УЗИ' },
  { value: 'mammography', label: 'Маммография' },
]

const REGIONS: Record<Modality, string[]> = {
  ct: ['Органы грудной клетки', 'Органы брюшной полости и таза', 'Голова', 'Позвоночник', 'Конечности'],
  mri: ['Головной мозг', 'Позвоночник', 'Суставы', 'Органы малого таза', 'Брюшная полость'],
  xray: ['Органы грудной клетки', 'Кости скелета', 'Брюшная полость'],
  us: ['Органы брюшной полости', 'Щитовидная железа', 'Молочные железы', 'Органы малого таза', 'Сосуды'],
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

// ─── Компонент ────────────────────────────────────────────────
interface ProtocolEditorTabProps {
  patientId: string
  tabId: string
  readOnly?: boolean
}

export function ProtocolEditorTab({ patientId, tabId, readOnly = false }: ProtocolEditorTabProps) {
  const { promoteProtocolTab } = usePatientTabsStore()
  const [step, setStep] = useState('0')
  const [form, setForm] = useState<ReportForm>({
    modality: 'ct',
    region: REGIONS.ct[0],
    contrast: false,
    description: '',
    conclusion: '',
  })
  const [lesions, setLesions] = useState<LesionRow[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [calcOpen, setCalcOpen] = useState(false)
  const conclusionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const cached = localStorage.getItem(TEMPLATE_CACHE_KEY)
    if (cached) { try { setTemplates(JSON.parse(cached)) } catch { /* ignore */ } }
    api.get<{ data: Template[] }>('/api/templates').then(({ data }) => {
      setTemplates(data.data ?? [])
      localStorage.setItem(TEMPLATE_CACHE_KEY, JSON.stringify(data.data ?? []))
    }).catch(() => { /* use cached */ })
  }, [])

  const handleInsertFromCalc = useCallback((text: string) => {
    const ta = conclusionRef.current
    if (ta) {
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? ta.value.length
      const newValue = ta.value.slice(0, start) + text + ta.value.slice(end)
      setForm((f) => ({ ...f, conclusion: newValue }))
      setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(start + text.length, start + text.length)
      }, 0)
    } else {
      setForm((f) => ({ ...f, conclusion: f.conclusion + (f.conclusion ? '\n' : '') + text }))
    }
  }, [])

  const handleSave = async () => {
    if (!form.description.trim() && !form.conclusion.trim()) {
      setError('Заполните описание или заключение')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = {
        patient_id: patientId,
        modality: form.modality,
        region: form.region,
        contrast: form.contrast,
        description: form.description,
        conclusion: form.conclusion,
        lesions: lesions.filter((l) => l.name.trim()),
      }
      const { data } = await api.post<{ data: { id: string; created_at: string } }>('/api/reports', body)
      const date = new Date(data.data.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
      promoteProtocolTab(patientId, tabId, data.data.id, date)
      setSaved(true)
    } catch {
      setError('Ошибка сохранения протокола')
    } finally {
      setSaving(false)
    }
  }

  // Контент шагов (упрощённый — аналогично ReportsPage, без дублирования кода)
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Tabs tabs={STEPS} active={step} onChange={setStep} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCalcOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'rgba(99,102,241,0.1)',
              color: '#818CF8',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <Settings2 size={13} />
            Калькуляторы
          </button>
          {!readOnly && (
            <Button size="sm" loading={saving} onClick={handleSave} disabled={saved}>
              {saved ? 'Сохранено ✓' : 'Сохранить протокол'}
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Шаг 0 — Исследование */}
      {step === '0' && (
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Модальность</Label>
              <Select
                value={form.modality}
                onChange={(e) => {
                  const m = e.target.value as Modality
                  setForm((f) => ({ ...f, modality: m, region: REGIONS[m][0] }))
                }}
                options={MODALITIES}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Область</Label>
              <Select
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                options={REGIONS[form.modality].map((r) => ({ value: r, label: r }))}
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contrast"
                checked={form.contrast}
                onChange={(e) => setForm((f) => ({ ...f, contrast: e.target.checked }))}
                disabled={readOnly}
              />
              <Label htmlFor="contrast">С контрастированием</Label>
            </div>
          </div>
        </Card>
      )}

      {/* Шаг 1 — Описание */}
      {step === '1' && (
        <Card>
          <Label>Описание исследования</Label>
          <SmartTextarea
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            templates={templates}
            modality={form.modality}
            region={form.region}
            section="description"
            disabled={readOnly}
            placeholder="Введите описание..."
            rows={12}
          />
        </Card>
      )}

      {/* Шаг 2 — Образования */}
      {step === '2' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <Label>Образования</Label>
            {!readOnly && (
              <Button size="sm" variant="secondary" onClick={() => setLesions((l) => [...l, newLesion()])}>
                + Добавить
              </Button>
            )}
          </div>
          {lesions.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ color: '#475569' }}>
              Образований нет
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lesions.map((l, i) => (
                <div key={l.id} className="flex flex-col gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: '#818CF8' }}>Образование {i + 1}</span>
                    {!readOnly && (
                      <button className="text-xs" style={{ color: '#EF4444' }} onClick={() => setLesions((ls) => ls.filter((x) => x.id !== l.id))}>
                        Удалить
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Название" value={l.name} onChange={(e) => setLesions((ls) => ls.map((x) => x.id === l.id ? { ...x, name: e.target.value } : x))} disabled={readOnly} />
                    <Input placeholder="Локализация" value={l.location} onChange={(e) => setLesions((ls) => ls.map((x) => x.id === l.id ? { ...x, location: e.target.value } : x))} disabled={readOnly} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="a, мм" type="number" value={l.size_a} onChange={(e) => setLesions((ls) => ls.map((x) => x.id === l.id ? { ...x, size_a: e.target.value } : x))} disabled={readOnly} />
                    <Input placeholder="b, мм" type="number" value={l.size_b} onChange={(e) => setLesions((ls) => ls.map((x) => x.id === l.id ? { ...x, size_b: e.target.value } : x))} disabled={readOnly} />
                    <Input placeholder="c, мм" type="number" value={l.size_c} onChange={(e) => setLesions((ls) => ls.map((x) => x.id === l.id ? { ...x, size_c: e.target.value } : x))} disabled={readOnly} />
                  </div>
                  {l.size_a && l.size_b && l.size_c && (
                    <div className="text-xs" style={{ color: '#64748B' }}>
                      Объём: {calcVolume(parseFloat(l.size_a), parseFloat(l.size_b), parseFloat(l.size_c)).toFixed(1)} мм³
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Шаг 3 — Заключение */}
      {step === '3' && (
        <Card>
          <Label>Заключение</Label>
          <SmartTextarea
            ref={conclusionRef}
            value={form.conclusion}
            onChange={(v) => setForm((f) => ({ ...f, conclusion: v }))}
            templates={templates}
            modality={form.modality}
            region={form.region}
            section="conclusion"
            disabled={readOnly}
            placeholder="Введите заключение..."
            rows={10}
          />
        </Card>
      )}

      <CalculatorDrawer
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onInsert={handleInsertFromCalc}
      />
    </div>
  )
}
```

---

### Task 13: Адаптировать калькуляторы — добавить onInsert

**Files:**
- Modify: `frontend/src/components/calculators/TiRadsCalculator.tsx`
- Modify: `frontend/src/components/calculators/FleischnerCalculator.tsx`
- Modify: `frontend/src/components/calculators/PiRadsCalculator.tsx`
- Modify: `frontend/src/components/calculators/LungRadsCalculator.tsx`

- [ ] **Step 1: Прочитать каждый калькулятор и найти где отображается результат**

```bash
cd frontend && grep -n "result\|Result\|рекомен\|category\|RADS" src/components/calculators/TiRadsCalculator.tsx | head -20
```

- [ ] **Step 2: Добавить проп onInsert в каждый калькулятор**

Для каждого файла:
1. Добавить `onInsert?: (text: string) => void` в props interface
2. Сформировать строку результата (из имеющихся данных)
3. Показать кнопку «Вставить в протокол» рядом с блоком результата:

```tsx
{onInsert && result && (
  <Button size="sm" variant="secondary" className="mt-2" onClick={() => onInsert(resultText)}>
    Вставить в протокол
  </Button>
)}
```

Строки результата (пример):
- TI-RADS: `"TI-RADS ${category} (${score} баллов). ${recommendation}"`
- Fleischner: `"Fleischner: ${recommendation}"`
- PI-RADS: `"PI-RADS ${score}. ${recommendation}"`
- Lung-RADS: `"Lung-RADS ${category}. ${recommendation}"`

- [ ] **Step 3: Финальная сборка**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ built in` без ошибок.

- [ ] **Step 4: Финальные тесты**

```bash
cd frontend && npm test 2>&1 | tail -10
```

Expected: все тесты зелёные.

- [ ] **Step 5: Финальный коммит**

```bash
git add frontend/src/
git commit -m "feat: patient-centric UI — PatientWorkspace, TabBar, PatientInfoTab, ProtocolEditorTab, CalculatorDrawer"
```

---

## Итоговая структура файлов

```
frontend/src/
├── stores/
│   ├── patientTabsStore.ts          ← новый
│   └── patientTabsStore.test.ts     ← новый
├── test/
│   └── setup.ts                     ← новый
├── pages/
│   ├── PatientWorkspace.tsx         ← новый
│   ├── PatientsPage.tsx             ← изменён
│   ├── DashboardPage.tsx            ← без изменений
│   └── LoginPage.tsx                ← без изменений
├── components/
│   ├── layout/
│   │   └── AppShell.tsx             ← полностью переписан
│   ├── patient/
│   │   ├── TabBar.tsx               ← новый
│   │   ├── PatientInfoTab.tsx       ← новый
│   │   ├── ProtocolEditorTab.tsx    ← новый (из ReportsPage)
│   │   └── CalculatorDrawer.tsx     ← новый
│   └── calculators/
│       ├── TiRadsCalculator.tsx     ← добавлен onInsert
│       ├── FleischnerCalculator.tsx ← добавлен onInsert
│       ├── PiRadsCalculator.tsx     ← добавлен onInsert
│       └── LungRadsCalculator.tsx   ← добавлен onInsert
├── App.tsx                          ← новый роутинг
└── index.css                        ← DM Sans
```
