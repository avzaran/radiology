import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import { FormField } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Tabs } from '../ui/Tabs'
import { Spinner } from '../ui/Spinner'
import { usePatientTabsStore } from '../../stores/patientTabsStore'
import api from '../../api/client'

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

interface Report {
  id: string
  modality: string
  region: string | null
  created_at: string
}

interface PatientForm {
  pseudonym: string
  birth_year: string
  sex: PatientSex
  notes: string
}

const EMPTY_FORM: PatientForm = { pseudonym: '', birth_year: '', sex: 'unknown', notes: '' }

const SEX_LABELS: Record<PatientSex, string> = {
  male: 'Мужской',
  female: 'Женский',
  unknown: 'Не указан',
}

const SEX_TABS = [
  { key: 'male', label: 'Мужской' },
  { key: 'female', label: 'Женский' },
  { key: 'unknown', label: 'Не указан' },
]

const MODALITY_LABELS: Record<string, string> = {
  ct: 'КТ',
  mri: 'МРТ',
  xray: 'Рентген',
  us: 'УЗИ',
  mammography: 'Маммо',
}

// ─── Props ───────────────────────────────────────────────────
interface Props {
  patientId: string
}

export function PatientInfoTab({ patientId }: Props) {
  const navigate = useNavigate()
  const { addProtocolTab, addSavedProtocolTab, closePatient } = usePatientTabsStore()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [patientRes, reportsRes] = await Promise.all([
        api.get<{ data: Patient }>(`/api/patients/${patientId}`),
        api.get<{ data: Report[] }>(`/api/patients/${patientId}/reports`),
      ])
      setPatient(patientRes.data.data)
      setReports(reportsRes.data.data)
      setError('')
    } catch {
      setError('Не удалось загрузить данные пациента')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openEdit = () => {
    if (!patient) return
    setForm({
      pseudonym: patient.pseudonym,
      birth_year: patient.birth_year ? String(patient.birth_year) : '',
      sex: patient.sex,
      notes: patient.notes ?? '',
    })
    setFormError('')
    setEditOpen(true)
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
      await api.put(`/api/patients/${patientId}`, body)
      setEditOpen(false)
      await loadData()
    } catch {
      setFormError('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/api/patients/${patientId}`)
      closePatient(patientId)
      navigate('/patients')
    } catch {
      setError('Ошибка удаления')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error && !patient) {
    return (
      <div className="p-4">
        <Alert variant="error">{error}</Alert>
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-5">
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* ─── Карточка пациента ─── */}
      <Card glow>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366F1' }}
              >
                {patient.pseudonym.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#E2E8F0' }}>
                  {patient.pseudonym}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={patient.sex === 'male' ? 'default' : patient.sex === 'female' ? 'warning' : 'default'}>
                    {SEX_LABELS[patient.sex]}
                  </Badge>
                  {patient.birth_year && (
                    <span className="text-xs" style={{ color: '#64748B' }}>
                      {patient.birth_year} г.р.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {patient.notes && (
              <div
                className="text-sm rounded-lg px-3 py-2 mt-2"
                style={{ color: '#94A3B8', backgroundColor: 'rgba(99,102,241,0.04)' }}
              >
                {patient.notes}
              </div>
            )}

            <div className="text-xs mt-3" style={{ color: '#475569' }}>
              Добавлен: {new Date(patient.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={openEdit}>
              Изменить
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              Удалить
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Список протоколов ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>
            Протоколы
          </h3>
          <Button size="sm" onClick={() => addProtocolTab(patientId)}>
            + Новый протокол
          </Button>
        </div>

        {reports.length === 0 ? (
          <Card>
            <div className="text-center py-6 text-sm" style={{ color: '#64748B' }}>
              Протоколов пока нет
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r) => {
              const dateStr = new Date(r.created_at).toLocaleDateString('ru-RU')
              return (
                <Card key={r.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge>{MODALITY_LABELS[r.modality] ?? r.modality}</Badge>
                      {r.region && (
                        <span className="text-xs truncate" style={{ color: '#94A3B8' }}>
                          {r.region}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: '#475569' }}>
                        {dateStr}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSavedProtocolTab(patientId, r.id, dateStr)}
                    >
                      Открыть →
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Модалка редактирования ─── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Редактировать пациента">
        <div className="flex flex-col gap-4">
          <FormField
            label="Псевдоним"
            required
            error={formError && !form.pseudonym.trim() ? 'Обязательное поле' : undefined}
          >
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
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button loading={saving} onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Модалка подтверждения удаления ─── */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить пациента?" size="sm">
        <p className="text-sm mb-4" style={{ color: '#64748B' }}>
          Это действие нельзя отменить. Все данные пациента будут удалены.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
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
