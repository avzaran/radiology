import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { FormField } from '../components/ui/FormField'
import { Modal } from '../components/ui/Modal'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { Spinner } from '../components/ui/Spinner'
import api from '../api/client'
import { usePatientTabsStore } from '../stores/patientTabsStore'

// ─── Типы ────────────────────────────────────────────────────
type PatientSex = 'male' | 'female' | 'unknown'

interface Patient {
  id: string
  pseudonym: string
  birth_year: number | null
  sex: PatientSex
  notes: string | null
  created_at: string
}

interface PatientForm {
  pseudonym: string
  birth_year: string
  sex: PatientSex
  notes: string
}

const EMPTY_FORM: PatientForm = { pseudonym: '', birth_year: '', sex: 'unknown', notes: '' }

const SEX_TABS = [
  { key: 'male', label: 'Мужской' },
  { key: 'female', label: 'Женский' },
  { key: 'unknown', label: 'Не указан' },
]

const SEX_LABELS: Record<PatientSex, string> = {
  male: 'М',
  female: 'Ж',
  unknown: '—',
}

// ─── Главный компонент ────────────────────────────────────────
export function PatientsPage() {
  const navigate = useNavigate()
  const openPatient = usePatientTabsStore((s) => s.openPatient)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPatients = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Patient[] }>('/api/patients')
      setPatients(data.data)
      setError('')
    } catch {
      setError('Не удалось загрузить пациентов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const filtered = patients.filter((p) =>
    p.pseudonym.toLowerCase().includes(search.toLowerCase()),
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (p: Patient) => {
    setEditingId(p.id)
    setForm({
      pseudonym: p.pseudonym,
      birth_year: p.birth_year ? String(p.birth_year) : '',
      sex: p.sex,
      notes: p.notes ?? '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.pseudonym.trim()) {
      setFormError('Псевдоним обязателен')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const body = {
        pseudonym: form.pseudonym.trim(),
        birth_year: form.birth_year ? parseInt(form.birth_year, 10) : undefined,
        sex: form.sex,
        notes: form.notes.trim() || undefined,
      }
      if (editingId) {
        await api.put(`/api/patients/${editingId}`, body)
      } else {
        await api.post('/api/patients', body)
      }
      setModalOpen(false)
      await loadPatients()
    } catch {
      setFormError('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/api/patients/${deleteId}`)
      setDeleteId(null)
      await loadPatients()
    } catch {
      setError('Ошибка удаления')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: '#E2E8F0' }}>
          Пациенты
        </h1>
        <Button size="sm" onClick={openCreate}>
          + Добавить
        </Button>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      <Input
        placeholder="Поиск по псевдониму..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-8" style={{ color: '#64748B' }}>
            {search ? 'Ничего не найдено' : 'Пациентов пока нет. Нажмите «+ Добавить», чтобы создать первого.'}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => {
                  openPatient(p.id, p.pseudonym)
                  navigate(`/patients/${p.id}`)
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm" style={{ color: '#E2E8F0' }}>
                      {p.pseudonym}
                    </span>
                    <Badge variant={p.sex === 'male' ? 'default' : p.sex === 'female' ? 'warning' : 'default'}>
                      {SEX_LABELS[p.sex]}
                    </Badge>
                    {p.birth_year && (
                      <span className="text-xs" style={{ color: '#64748B' }}>
                        {p.birth_year} г.р.
                      </span>
                    )}
                  </div>
                  {p.notes && (
                    <div className="text-xs mt-1" style={{ color: '#64748B' }}>
                      {p.notes}
                    </div>
                  )}
                  <div className="text-xs mt-2" style={{ color: '#475569' }}>
                    Добавлен: {new Date(p.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                    Изменить
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>
                    Удалить
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Модалка добавления/редактирования */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Редактировать пациента' : 'Новый пациент'}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Псевдоним" required error={formError && !form.pseudonym.trim() ? 'Обязательное поле' : undefined}>
            <Input
              value={form.pseudonym}
              onChange={(e) => setForm((f) => ({ ...f, pseudonym: e.target.value }))}
              placeholder="Например: Пациент А-001"
              autoFocus
            />
          </FormField>

          <FormField label="Год рождения">
            <Input
              type="number"
              value={form.birth_year}
              onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
              placeholder="1985"
              min="1900"
              max="2100"
            />
          </FormField>

          <div>
            <Label>Пол</Label>
            <Tabs
              tabs={SEX_TABS}
              active={form.sex}
              onChange={(key) => setForm((f) => ({ ...f, sex: key as PatientSex }))}
            />
          </div>

          <FormField label="Заметки">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
              rows={3}
              className="w-full rounded-lg outline-none text-sm px-3 py-2 resize-none placeholder:text-text-secondary"
              style={{
                backgroundColor: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#E2E8F0',
              }}
            />
          </FormField>

          {formError && <Alert>{formError}</Alert>}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {editingId ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка подтверждения удаления */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Удалить пациента?"
        size="sm"
      >
        <p className="text-sm mb-4" style={{ color: '#64748B' }}>
          Это действие нельзя отменить. Все данные пациента будут удалены.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Отмена
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Удалить
          </Button>
        </div>
      </Modal>
    </div>
  )
}
