import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../api/client'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

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
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            inputSize="lg"
          />

          {error && <Alert>{error}</Alert>}

          <Button type="submit" loading={loading} size="lg" fullWidth>
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <Button variant="ghost" size="sm" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </Button>
        </div>
      </div>
    </div>
  )
}
