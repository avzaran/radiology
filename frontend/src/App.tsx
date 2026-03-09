import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ReportsPage } from './pages/ReportsPage'
import { PatientsPage } from './pages/PatientsPage'

// Заглушки для страниц, которые будут реализованы в следующих этапах
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="max-w-4xl mx-auto">
    <h1 className="text-xl font-semibold mb-4" style={{ color: '#E2E8F0' }}>
      {title}
    </h1>
    <div
      className="p-8 rounded-xl text-center"
      style={{ backgroundColor: '#0F172A', border: '1px solid rgba(99,102,241,0.15)', color: '#64748B' }}
    >
      В разработке...
    </div>
  </div>
)

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="calculator" element={<Navigate to="/calculator/tirads" replace />} />
          <Route path="calculator/:type" element={<PlaceholderPage title="Калькулятор шкалы" />} />
          <Route path="tracker" element={<PlaceholderPage title="Трекер образований" />} />
          <Route path="tracker/:id" element={<PlaceholderPage title="Карточка образования" />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
