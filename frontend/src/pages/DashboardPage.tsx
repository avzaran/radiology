import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '../stores/authStore'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import api from '../api/client'

// ─── Типы ────────────────────────────────────────────────────────────────────

interface Summary {
  patients: number
  reports: number
  scale_results: number
  reports_this_month: number
  by_modality: Record<string, number>
  by_scale: Record<string, number>
}

interface RecentReport {
  id: string
  modality: string
  region: string | null
  created_at: string
  patient_name: string | null
}

// ─── Вспомогательные данные ───────────────────────────────────────────────────

const MODALITY_LABELS: Record<string, string> = {
  ct: 'КТ',
  mri: 'МРТ',
  xray: 'Рентген',
  us: 'УЗИ',
  mammography: 'Маммо',
}

const QUICK_ACTIONS = [
  { href: '/calculator/tirads',     icon: '◉', title: 'TI-RADS' },
  { href: '/calculator/fleischner', icon: '◈', title: 'Fleischner' },
  { href: '/calculator/pirads',     icon: '◧', title: 'Pi-RADS' },
  { href: '/calculator/lungrads',   icon: '◫', title: 'Lung-RADS' },
  { href: '/patients',              icon: '⊕', title: 'Пациенты' },
  { href: '/tracker',               icon: '◎', title: 'Трекер' },
  { href: '/reports',               icon: '◰', title: 'Заключения' },
]

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recent, setRecent] = useState<RecentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/statistics/summary'),
      api.get('/api/statistics/recent'),
    ])
      .then(([s, r]) => {
        setSummary(s.data.data as Summary)
        setRecent(r.data.data as RecentReport[])
      })
      .catch(() => setError('Не удалось загрузить статистику'))
      .finally(() => setLoading(false))
  }, [])

  const modalityData = summary
    ? Object.entries(summary.by_modality).map(([key, count]) => ({
        name: MODALITY_LABELS[key] ?? key.toUpperCase(),
        count,
      }))
    : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#E2E8F0' }}>
          Добро пожаловать{user?.email ? `, ${user.email}` : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Радиологический ассистент
        </p>
      </div>

      {/* Ошибка */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Загрузка */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Счётчики */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Пациенты" value={summary.patients} />
            <StatCard label="Протоколы" value={summary.reports} />
            <StatCard label="В этом месяце" value={summary.reports_this_month} accent />
            <StatCard label="Расчёты шкал" value={summary.scale_results} />
          </div>

          {/* График + последние протоколы */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* BarChart по модальностям */}
            <Card>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#64748B' }}>
                Протоколы по модальностям
              </h2>
              {modalityData.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: '#64748B' }}>
                  Протоколов пока нет
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={modalityData} barCategoryGap="30%">
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: 8,
                        color: '#E2E8F0',
                        fontSize: 12,
                      }}
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                    />
                    <Bar dataKey="count" name="Протоколов" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Последние протоколы */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
                  Последние протоколы
                </h2>
                <Link
                  to="/reports"
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: '#6366F1', textDecoration: 'none' }}
                >
                  Все →
                </Link>
              </div>

              {recent.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: '#64748B' }}>
                  Протоколов пока нет
                </p>
              ) : (
                <div className="space-y-2">
                  {recent.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(99,102,241,0.05)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: '#E2E8F0' }}>
                          {r.patient_name ?? 'Пациент не указан'}
                          {r.region ? ` — ${r.region}` : ''}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                          {MODALITY_LABELS[r.modality] ?? r.modality.toUpperCase()} ·{' '}
                          {new Date(r.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Быстрые действия */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748B' }}>
          Быстрый доступ
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              to={a.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#94A3B8',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
                e.currentTarget.style.color = '#E2E8F0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)'
                e.currentTarget.style.color = '#94A3B8'
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{a.icon}</span>
              {a.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748B' }}>
        {label}
      </p>
      <p
        className="text-3xl font-bold"
        style={{
          color: accent ? '#6366F1' : '#E2E8F0',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {value}
      </p>
    </Card>
  )
}
