import { useAuthStore } from '../stores/authStore'

export function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: '#E2E8F0' }}>
          Добро пожаловать{user?.email ? `, ${user.email}` : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Радиологический ассистент
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="block p-5 rounded-xl transition-colors"
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid rgba(99,102,241,0.15)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)')}
          >
            <div className="text-2xl mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {action.icon}
            </div>
            <div className="font-medium text-sm mb-1" style={{ color: '#E2E8F0' }}>
              {action.title}
            </div>
            <div className="text-xs" style={{ color: '#64748B' }}>
              {action.description}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  {
    href: '/calculator/tirads',
    icon: '◉',
    title: 'TI-RADS',
    description: 'Оценка узлов щитовидной железы',
  },
  {
    href: '/calculator/fleischner',
    icon: '◈',
    title: 'Fleischner 2017',
    description: 'Тактика при лёгочных узлах',
  },
  {
    href: '/calculator/birads',
    icon: '◧',
    title: 'BI-RADS',
    description: 'Категории молочной железы',
  },
  {
    href: '/calculator/lungrads',
    icon: '◫',
    title: 'Lung-RADS',
    description: 'Скрининг рака лёгкого',
  },
  {
    href: '/tracker',
    icon: '◎',
    title: 'Трекер образований',
    description: 'Динамика и VDT-расчёт',
  },
  {
    href: '/reports',
    icon: '◰',
    title: 'Генератор заключений',
    description: 'Структурированные протоколы',
  },
]
