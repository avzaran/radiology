import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../api/client'

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const body = isRegister ? { email, password, full_name: fullName } : { email, password }
      const { data } = await api.post(endpoint, body)
      setUser(data.data.user, data.data.access_token, data.data.refresh_token)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0A0E1A' }}>
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ backgroundColor: '#0F172A', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div className="text-center mb-8">
          <div className="text-xl font-bold mb-1" style={{ color: '#6366F1', fontFamily: 'JetBrains Mono, monospace' }}>
            RadAssist PRO
          </div>
          <div className="text-sm" style={{ color: '#64748B' }}>
            {isRegister ? 'Создать аккаунт' : 'Вход в систему'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Полное имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="px-4 py-3 rounded-lg text-sm outline-none w-full"
              style={{
                backgroundColor: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#E2E8F0',
              }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-3 rounded-lg text-sm outline-none w-full"
            style={{
              backgroundColor: 'rgba(99,102,241,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#E2E8F0',
            }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="px-4 py-3 rounded-lg text-sm outline-none w-full"
            style={{
              backgroundColor: 'rgba(99,102,241,0.05)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#E2E8F0',
            }}
          />

          {error && (
            <div className="text-xs px-3 py-2 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-lg font-medium text-sm transition-opacity"
            style={{ backgroundColor: '#6366F1', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs"
            style={{ color: '#64748B' }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  )
}
