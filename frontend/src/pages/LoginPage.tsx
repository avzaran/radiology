import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../api/client'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message
        if (msg) {
          setError(msg)
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
          setError('Сервер недоступен. Убедитесь, что бэкенд запущен на порту 4000.')
        } else {
          setError(`Ошибка ${err.response.status}: ${err.response.statusText}`)
        }
      } else {
        setError('Неизвестная ошибка')
      }
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
            <Input
              type="text"
              placeholder="Полное имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              inputSize="lg"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputSize="lg"
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Пароль (минимум 8 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              inputSize="lg"
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
              tabIndex={-1}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          {error && <Alert>{error}</Alert>}

          <Button type="submit" loading={loading} size="lg" fullWidth>
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <Button variant="ghost" size="sm" onClick={() => { setIsRegister(!isRegister); setError('') }}>
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </Button>
        </div>
      </div>
    </div>
  )
}
