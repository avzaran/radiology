import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
})

// Подставляем JWT из localStorage в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Автоматический refresh при 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh_token = localStorage.getItem('refresh_token')
      if (!refresh_token) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post(
          `${import.meta.env['VITE_API_URL'] ?? 'http://localhost:4000'}/api/auth/refresh`,
          { refresh_token }
        )
        localStorage.setItem('access_token', data.data.access_token)
        original.headers['Authorization'] = `Bearer ${data.data.access_token}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
