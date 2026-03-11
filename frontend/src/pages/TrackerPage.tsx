import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import api from '../api/client'

// ─── Типы ────────────────────────────────────────────────────

interface Patient {
  id: string
  pseudonym: string
  birth_year: number | null
  sex: 'male' | 'female' | 'unknown'
  notes: string | null
  created_at: string
}

const SEX_LABELS: Record<Patient['sex'], string> = {
  male: 'М',
  female: 'Ж',
  unknown: '—',
}

// ─── Главный компонент ────────────────────────────────────────

export function TrackerPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api
      .get<{ data: Patient[] }>('/api/patients')
      .then(({ data }) => setPatients(data.data))
      .catch(() => setError('Не удалось загрузить список пациентов'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter((p) =>
    p.pseudonym.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      {/* Заголовок */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#E2E8F0' }}>
          Трекер образований
        </h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
          Динамика размеров и расчёт VDT по протоколам пациентов
        </p>
      </div>

      {/* Поиск */}
      <Input
        placeholder="Поиск пациента..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Состояния */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && !error && patients.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
            <div style={{ fontSize: 15, marginBottom: 6, color: '#E2E8F0' }}>Пациентов ещё нет</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Добавьте пациентов в разделе «Пациенты», чтобы отслеживать динамику образований.
            </div>
            <Button size="sm" onClick={() => navigate('/patients')}>
              Перейти к пациентам
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && patients.length > 0 && filtered.length === 0 && (
        <Card>
          <div className="text-center py-6" style={{ color: '#64748B', fontSize: 13 }}>
            Пациент не найден
          </div>
        </Card>
      )}

      {/* Список пациентов */}
      <div className="flex flex-col gap-3">
        {filtered.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ color: '#E2E8F0', fontWeight: 500, fontSize: 15 }}>
                  {p.pseudonym}
                </span>
                <Badge>{SEX_LABELS[p.sex]}</Badge>
                {p.birth_year && (
                  <span style={{ color: '#64748B', fontSize: 13 }}>{p.birth_year} г.р.</span>
                )}
              </div>
              <Button size="sm" onClick={() => navigate(`/tracker/${p.id}`)}>
                Открыть трекер →
              </Button>
            </div>
            {p.notes && (
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>{p.notes}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
