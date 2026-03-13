# Spec: Patient-Centric Navigation Architecture

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

Переработка навигации RadAssist PRO: от плоского меню к пациент-центричному интерфейсу в стиле VS Code. Боковая панель содержит только два пункта («Главная» и «Пациенты»), а работа с конкретным пациентом происходит через динамические подпункты и горизонтальные вкладки.

---

## Design Tokens

### Typography
- **Font stack:** `'DM Sans', 'Segoe UI', sans-serif`
- Подключение: `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap')` в `index.css`
- Заменить JetBrains Mono иконки на SVG-иконки (Lucide React)

### Colors (без изменений)
- `bg-base`: `#0A0E1A`
- `bg-card`: `#0F172A`
- `bg-surface`: `#131929`
- `accent`: `#6366F1`
- `accent-hover`: `#4F46E5`
- `text-primary`: `#E2E8F0`
- `text-secondary`: `#64748B`
- `border`: `rgba(99,102,241,0.15)`

### Sidebar visual refresh
- Ширина: `224px` (было 224px / `w-56`)
- Логотип: "RadAssist" жирным DM Sans 600, "PRO" — badge `accent` цвета
- Nav items: `px-3 py-2 rounded-lg`, active state — `bg accent/15` + левая полоска `2px accent`
- Подпункты пациентов: indent `pl-7`, шрифт `text-xs`, иконка пользователя слева, кнопка ✕ справа (показывается при hover)

---

## Architecture

### Routing (App.tsx)
```
/login               → LoginPage
/                    → AppShell > DashboardPage
/patients            → AppShell > PatientsPage (список)
/patients/:id        → AppShell > PatientWorkspace (вкладки пациента)
```

Убираются маршруты:
- `/calculator`, `/calculator/:type`
- `/tracker`, `/tracker/:id`
- `/reports` (генератор переезжает в PatientWorkspace)
- `/settings` (PlaceholderPage удаляется — в скоупе этой задачи не нужен)

### State: patientTabsStore (Zustand)

```ts
type TabType = 'info' | 'protocol-new' | 'protocol-saved'

interface PatientTab {
  id: string        // 'info' | 'protocol-new' | `protocol-${uuid}` (для сохранённых)
  type: TabType
  label: string     // 'Информация' | 'Новый протокол' | 'Протокол 12.03.2026'
  closable: boolean // info → false, все протоколы → true
}

interface OpenPatient {
  id: string
  pseudonym: string  // значение поля pseudonym из API (используется в сайдбаре)
  activeTabId: string
  tabs: PatientTab[]
}

interface PatientTabsStore {
  openPatients: OpenPatient[]
  activePatientId: string | null
  // Если пациент уже открыт — просто переключает на него (не дублирует)
  openPatient: (id: string, pseudonym: string) => void
  closePatient: (id: string) => void
  setActivePatient: (id: string) => void
  addProtocolTab: (patientId: string) => void
  closeTab: (patientId: string, tabId: string) => void
  setActiveTab: (patientId: string, tabId: string) => void
}
```

**Поведение `openPatient` при повторном вызове:**
- Если `id` уже есть в `openPatients` → только `setActivePatient(id)` + navigate, без дублирования
- Если новый → добавить в список с вкладкой `info` по умолчанию

**Жизненный цикл вкладки протокола:**
- `addProtocolTab` → создаёт вкладку `protocol-new` с временным id
- После `Сохранить протокол` (POST /api/reports) → вкладка меняет тип на `protocol-saved`, `id` обновляется до `protocol-${reportId}`, label — на дату
- `closeTab` для `protocol-new` — без подтверждения; для `protocol-saved` — без подтверждения (уже сохранено)

Комментарий для апгрейда до persist:
```ts
// TODO: upgrade to persist — add persist middleware from zustand/middleware
// export const usePatientTabsStore = create(persist(storeImpl, { name: 'rad-patient-tabs', version: 1 }))
```

---

## Components

### AppShell (рефакторинг)

**Sidebar nav items:**
```
⌂  Главная           /
👥 Пациенты          /patients
   └─ Иванов И.И. ✕  /patients/1  (динамически из store)
   └─ Петрова А.С. ✕ /patients/2
```

- NAV_ITEMS сокращается до 2 пунктов
- Под «Пациенты» рендерятся `openPatients` из store
- Клик по подпункту: `setActivePatient(id)` + `navigate('/patients/:id')`
- Кнопка ✕: `closePatient(id)`, если был активный — переход на `/patients`
- Иконки: заменить unicode-символы на Lucide React (`Home`, `Users`, `User`, `X`)

**Bottom nav (мобайл):** только «Главная» и «Пациенты»
- При нахождении на `/patients/:id` — пункт «Пациенты» остаётся активным (isActive по prefix)
- v1 fallback: открытые пациенты недоступны через bottom nav напрямую — врач возвращается через «Пациенты» → список → повторный клик (пациент уже в store, вкладки сохранены)

### PatientsPage (минимальные изменения)

- Клик по строке пациента → `openPatient(id, name)` + `navigate('/patients/:id')`
- Убрать кнопку «Трекер →»
- Заголовок и дизайн строк: обновить шрифт + чуть увеличить padding

### PatientWorkspace (новый компонент)

`frontend/src/pages/PatientWorkspace.tsx`

**Bootstrap при прямом переходе по URL `/patients/:id`:**
- При монтировании: если `id` отсутствует в store → вызвать `GET /api/patients/:id`, получить `pseudonym` → вызвать `openPatient(id, pseudonym)`
- Пока загружается — показать `<Spinner />`
- Если API вернул 404 → redirect на `/patients` с Alert «Пациент не найден»
- Если пациент уже в store → сразу рендерить без запроса

Структура:
```
┌──────────────────────────────────────────────┐
│ [Информация] [Новый протокол ✕] [+]          │  ← TabBar
├──────────────────────────────────────────────┤
│                                              │
│  <TabContent />                              │
│                                              │
└──────────────────────────────────────────────┘
```

**TabBar:**
- Горизонтальные вкладки, стиль VS Code: нижняя граница active-tab цвета accent
- `[+]` кнопка — добавить новый протокол (`addProtocolTab`)
- Вкладка «Информация» — не закрываемая (нет ✕)
- Вкладки протоколов — закрываемые

**Вкладка «Информация» — PatientInfoTab:**
- Верхний блок: псевдоним, пол, год рождения, заметки + кнопка «Редактировать»
- Нижний блок: список предыдущих протоколов
  - Источник: `GET /api/patients/:id/reports` (существующий эндпоинт)
  - Отображаемые поля: дата (`created_at`), модальность (`modality`), первые 120 символов текста
  - Клик по протоколу → открывает вкладку `protocol-saved` с режимом просмотра (read-only)
  - Если протоколов нет → заглушка «Протоколов пока нет»
- CTA кнопка: `+ Новый протокол` → `addProtocolTab(patientId)`

**Вкладка «Новый протокол» — ProtocolEditorTab:**
- Генератор заключений (текущий ReportsPage, адаптированный)
- Шапка вкладки: выбор модальности, дата
- Кнопка `⚙ Калькуляторы` в toolbar → открывает `CalculatorDrawer`
- Кнопка `Сохранить протокол` → POST /api/reports (с привязкой к patient_id)

**CalculatorDrawer (новый компонент):**
- Выезжает справа (drawer, `w-80`), не перекрывает полностью контент (overlay полупрозрачный)
- Tabs внутри: TI-RADS | Fleischner | PI-RADS | Lung-RADS
- Встраивает существующие компоненты: TiRadsCalculator, FleischnerCalculator, etc.
- Закрывается кнопкой ✕ или кликом по overlay
- **Передача результата в редактор протокола:** каждый калькулятор при получении результата показывает кнопку «Вставить в протокол». При клике — результат (строка) передаётся через callback `onInsert: (text: string) => void`, который в `ProtocolEditorTab` вставляет текст в позицию курсора (или в конец, если курсор не установлен). Drawer остаётся открытым после вставки.

---

## Files to Create / Modify

### Создать
- `frontend/src/stores/patientTabsStore.ts`
- `frontend/src/pages/PatientWorkspace.tsx`
- `frontend/src/components/patient/PatientInfoTab.tsx`
- `frontend/src/components/patient/ProtocolEditorTab.tsx`
- `frontend/src/components/patient/TabBar.tsx`
- `frontend/src/components/patient/CalculatorDrawer.tsx`

### Изменить
- `frontend/src/App.tsx` — новый роутинг, убрать старые маршруты
- `frontend/src/components/layout/AppShell.tsx` — новая навигация, Lucide иконки, подпункты пациентов
- `frontend/src/pages/PatientsPage.tsx` — клик открывает пациента, убрать кнопку «Трекер →»
- `frontend/src/index.css` — DM Sans import, обновить font-family

### Удалить/оставить неиспользуемыми
- `frontend/src/pages/TrackerPage.tsx` — не удалять физически, просто убрать из роутинга
- `frontend/src/pages/PatientTrackerPage.tsx` — аналогично
- `frontend/src/pages/CalculatorPage.tsx` — убрать из роутинга, логика живёт в CalculatorDrawer

---

## Upgrade Path to Option C (localStorage persist)

Когда понадобится:
1. Установить `zustand/middleware` persist (уже есть в пакете)
2. Обернуть store в `persist(...)` с `name: 'rad-patient-tabs'`
3. Добавить `version` и `migrate` для очистки устаревших данных
4. Опционально: `partialize` — сохранять только `openPatients`, не `activePatientId`

---

## Out of Scope

- Трекер образований — удаляется из навигации полностью (данные в протоколах)
- Мобильный drawer для открытых пациентов — v2
- Drag-and-drop сортировка вкладок — v2
