import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'

const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: '⌂' },
  { to: '/calculator', label: 'Калькуляторы', icon: '◈' },
  { to: '/tracker', label: 'Трекер', icon: '◉' },
  { to: '/reports', label: 'Заключения', icon: '◧' },
]

export function AppShell() {
  const { isAuthenticated, logout, user } = useAuthStore()
  const { isOnline, setOnline } = useUIStore()
  const navigate = useNavigate()

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0A0E1A', color: '#E2E8F0' }}>
      {/* Боковая панель — десктоп */}
      <aside
        className="hidden lg:flex flex-col w-56 border-r shrink-0"
        style={{ backgroundColor: '#0F172A', borderColor: 'rgba(99,102,241,0.15)' }}
      >
        <div className="p-5 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
          <div className="text-sm font-bold" style={{ color: '#6366F1', fontFamily: 'JetBrains Mono, monospace' }}>
            RadAssist PRO
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>
            {user?.email ?? '—'}
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? '#E2E8F0' : '#64748B',
                borderLeft: isActive ? '2px solid #6366F1' : '2px solid transparent',
              })}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
          {!isOnline && (
            <div
              className="text-xs px-2 py-1 rounded mb-2 text-center"
              style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#EAB308' }}
            >
              Офлайн-режим
            </div>
          )}
          <button
            onClick={logout}
            className="w-full text-xs px-3 py-2 rounded-lg transition-colors"
            style={{ color: '#64748B', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Нижняя навигация — мобайл/планшет */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t z-50"
          style={{ backgroundColor: '#0F172A', borderColor: 'rgba(99,102,241,0.15)' }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex-1 flex flex-col items-center py-2 gap-1"
              style={({ isActive }) => ({ color: isActive ? '#6366F1' : '#64748B' })}
            >
              <span className="text-lg" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
