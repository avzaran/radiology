# Patient Workspace Architecture — Design Spec

**Date:** 2026-03-13
**Status:** Draft

---

## Context

Текущая архитектура RadAssist PRO имеет плоскую навигацию: Главная, Пациенты, Калькуляторы, Трекер, Заключения — все как отдельные пункты сайдбара. Это не соответствует рабочему процессу врача-рентгенолога, который работает с конкретным пациентом и в контексте этого пациента создаёт протоколы, при необходимости использует калькуляторы шкал.

Цель: перейти к VS Code-подобной рабочей области, где пациент "открывается" как сессия с вкладками, а сайдбар отражает открытых пациентов. Калькуляторы встраиваются в форму нового протокола. Трекер удаляется из навигации как нерелевантный для рентгенологов.

---

## Routing

```
/ → DashboardPage (без изменений)
/login → LoginPage (без изменений)
/patients → PatientsPage (список пациентов)
/patients/:id → PatientWorkspacePage (NEW)

Сохраняются, но убраны из навигации:
  /tracker, /tracker/:id
  /calculator/:type
  /reports
```

---

## Sidebar Structure

```
┌─────────────────┐
│ RadAssist PRO   │
├─────────────────┤
│ ⊞ Главная       │  → /
├─────────────────┤
│ ◉ Пациенты      │  → /patients
│   └ Иванов И.И. │  → /patients/1  [×]
│   └ Петрова А.С.│  → /patients/2  [×]
├─────────────────┤
│                 │
├─────────────────┤
│ ⊗ Выйти         │
└─────────────────┘
```

- **"Пациенты"**: клик → `/patients`. Всегда видим. Если есть открытые пациенты — показывает sub-items.
- **Sub-item пациента**: появляется при `openPatient()`, активный подсвечен акцентным цветом `#6366F1`.
- **[×] на sub-item**: вызывает `closePatient(id)` + navigate `/patients` если это активный пациент.
- **Убраны**: Калькуляторы, Трекер, Заключения.

---

## State Management

### patientTabsStore (расширить существующий)

Файл: `frontend/src/stores/patientTabsStore.ts`

Добавить `persist` middleware (zustand/middleware). Ключ: `'rad_patient_tabs_v1'`.

Существующая структура хранилища остаётся без изменений:

```typescript
type TabType = 'info' | 'protocol-new' | 'protocol-saved'

interface PatientTab {
  id: string
  type: TabType
  label: string
  closable: boolean
}

interface OpenPatient {
  id: string
  pseudonym: string
  activeTabId: string
  tabs: PatientTab[]
}
```

Существующие методы (`openPatient`, `closePatient`, `addProtocolTab`, `promoteProtocolTab`, `closeTab`, `setActiveTab`, `setActivePatient`) сохраняются без изменений.

**Поведение при восстановлении после F5:**
- Store десериализуется из localStorage
- `PatientWorkspacePage` при монтировании проверяет: если `id` из URL есть в store → `setActivePatient(id)`. Если нет — вызывает `openPatient()` (нужно загрузить pseudonym из API).

---

## Components

### Новые компоненты

#### `PatientWorkspacePage.tsx`
**Путь:** `frontend/src/pages/PatientWorkspacePage.tsx`

**Ответственность:** Контейнер рабочей области пациента.
- Читает `:id` из `useParams()`
- При монтировании: если пациент не открыт в store → загружает `/api/patients/:id` и вызывает `openPatient(id, pseudonym)`
- Рендерит `PatientTabBar` + содержимое активной вкладки

#### `PatientTabBar.tsx`
**Путь:** `frontend/src/components/patient/PatientTabBar.tsx`

**Ответственность:** Горизонтальная строка вкладок (VS Code стиль).
- Получает `tabs` и `activeTabId` из store
- Рендерит каждую вкладку: имя + опциональный [×]
- [×] → `closeTab(patientId, tabId)`
- Кнопка "+ Новый протокол" в конце строки → `addProtocolTab(patientId)`

#### `PatientInfoTab.tsx`
**Путь:** `frontend/src/components/patient/PatientInfoTab.tsx`

**Ответственность:** Информация о пациенте + список протоколов + редактирование.
- Загружает `GET /api/patients/:id` и `GET /api/patients/:id/reports`
- Отображает: псевдоним, год рождения, пол, заметки
- Кнопки: "Изменить" (встроенная форма/Modal) + "Удалить" (с подтверждением + `closePatient` + navigate)
- Список протоколов: дата, модальность, кнопка "Открыть" → открывает `SavedProtocolTab`

#### `NewProtocolTab.tsx`
**Путь:** `frontend/src/components/patient/NewProtocolTab.tsx`

**Ответственность:** Форма создания нового протокола.
- Переиспользует **логику и UI из `ReportsPage.tsx`** (шаги 0–3 wizard, SmartTextarea, live preview)
- Принимает `patientId` и `tabId` как props
- При успешном сохранении: `promoteProtocolTab(patientId, tabId, reportId, date)` → вкладка становится `protocol-saved`
- Правая кнопка-тоггл "⊕ Калькулятор" → показывает/скрывает `CalculatorSidePanel`

#### `CalculatorSidePanel.tsx`
**Путь:** `frontend/src/components/patient/CalculatorSidePanel.tsx`

**Ответственность:** Боковая выдвижная панель с калькуляторами.
- Показывает выбор: TI-RADS / Fleischner / Pi-RADS / Lung-RADS
- Переиспользует существующие компоненты из `frontend/src/components/calculators/`
- Результат расчёта — отображается внутри панели, можно скопировать

#### `SavedProtocolTab.tsx`
**Путь:** `frontend/src/components/patient/SavedProtocolTab.tsx`

**Ответственность:** Read-only просмотр сохранённого протокола.
- Загружает `GET /api/reports/:id` (или получает данные из списка протоколов)
- Форматированный вывод текста протокола
- Кнопка "Скопировать"

---

### Изменяемые компоненты

#### `AppShell.tsx`
**Изменения:**
1. Убрать навигационные элементы: Калькуляторы, Трекер, Заключения
2. Добавить секцию "Пациенты" с sub-items из `patientTabsStore.openPatients`
3. Sub-item: клик → navigate `/patients/:id` + `setActivePatient(id)`; × → `closePatient(id)`
4. Убрать мобильное bottom-nav для Калькуляторов/Трекера/Заключений

#### `PatientsPage.tsx`
**Изменения:**
1. Клик на строку пациента в таблице → `openPatient(id, pseudonym)` + navigate `/patients/:id`
2. Убрать кнопку "Трекер →" с каждого пациента (трекер выводится из навигации)

#### `App.tsx`
**Изменения:**
1. Добавить route: `<Route path="patients/:id" element={<PatientWorkspacePage />} />`

---

## Data Flow

```
1. PatientsPage: клик на пациента
   → openPatient(id, pseudonym)
   → navigate('/patients/:id')

2. PatientWorkspacePage монтируется
   → useParams() → id
   → Если в store: setActivePatient(id)
   → Если нет: GET /api/patients/:id → openPatient(id, data.pseudonym)
   → Рендерит PatientTabBar + PatientInfoTab (активная вкладка = 'info')

3. Пользователь нажимает "+ Новый протокол"
   → addProtocolTab(patientId)
   → Новая вкладка 'protocol-new' становится активной
   → Рендерится NewProtocolTab

4. Врач заполняет wizard → нажимает "Сохранить"
   → POST /api/reports/generate { patient_id, ...reportData }
   → promoteProtocolTab(patientId, tabId, reportId, formatDate)
   → Вкладка переименовывается в дату, тип меняется на 'protocol-saved'

5. Врач открывает сохранённый протокол из PatientInfoTab
   → Проверяет: если вкладка уже открыта → setActiveTab(patientId, tabId)
   → Иначе: добавляет tab с type='protocol-saved', label=дата
   → Рендерится SavedProtocolTab

6. F5 (перезагрузка)
   → Store восстанавливается из localStorage
   → PatientWorkspacePage: id из URL найден в store → setActivePatient(id)
   → Все вкладки восстановлены
```

---

## API Response Formats

**POST /api/reports/generate** (используется в NewProtocolTab при сохранении):
```json
{ "data": { "id": "string", "created_at": "ISO string" } }
```
`reportId = data.id`, `label = formatDate(data.created_at)` (например "05.03.2026")

**GET /api/reports/:id** (используется в SavedProtocolTab):
```json
{
  "data": {
    "id": "string",
    "created_at": "ISO string",
    "modality": "ct|mri|xray|us|mammography",
    "region": "string",
    "description": "string",
    "conclusion": "string",
    "content": "string"
  }
}
```

---

## ReportsPage → NewProtocolTab Migration

`ReportsPage.tsx` содержит ~522 строки с wizard-логикой (форма, состояние, шаблоны, SmartTextarea).

**Стратегия:**
- Вынести **типы и логику** (`ReportForm`, `LesionRow`, `buildPreview`, шаги) в `NewProtocolTab.tsx`
- `ReportsPage.tsx` оставить как wrapper (для сохранения роута `/reports`), но он может просто рендерить `<NewProtocolTab patientId={null} tabId="standalone" />`
- `NewProtocolTab` принимает опциональный `patientId`: если null — standalone режим (обратная совместимость), если задан — интеграция со store

---

## Files Summary

| Файл | Действие |
|------|---------|
| `pages/PatientWorkspacePage.tsx` | СОЗДАТЬ |
| `components/patient/PatientTabBar.tsx` | СОЗДАТЬ |
| `components/patient/PatientInfoTab.tsx` | СОЗДАТЬ |
| `components/patient/NewProtocolTab.tsx` | СОЗДАТЬ (перенос логики из ReportsPage) |
| `components/patient/CalculatorSidePanel.tsx` | СОЗДАТЬ |
| `components/patient/SavedProtocolTab.tsx` | СОЗДАТЬ |
| `components/layout/AppShell.tsx` | ИЗМЕНИТЬ |
| `pages/PatientsPage.tsx` | ИЗМЕНИТЬ |
| `App.tsx` | ИЗМЕНИТЬ |
| `stores/patientTabsStore.ts` | ИЗМЕНИТЬ (добавить persist) |
| `pages/ReportsPage.tsx` | ИЗМЕНИТЬ (сделать wrapper вокруг NewProtocolTab) |

---

## Verification

1. `npm run build` — сборка без ошибок TypeScript
2. `npm test` — все тесты patientTabsStore проходят
3. Ручная проверка:
   - Открыть /patients, кликнуть на пациента → URL меняется на /patients/:id, sub-item появляется в сайдбаре
   - F5 → пациент остаётся открытым, вкладки восстановлены
   - Открыть несколько пациентов → переключение через сайдбар показывает только их вкладки
   - Создать новый протокол → wizard работает → вкладка промоутится
   - [×] на пациенте в сайдбаре → пациент закрывается, navigate на /patients
