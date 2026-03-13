import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatientTabsStore } from '../stores/patientTabsStore'
import { PatientTabBar } from '../components/patient/PatientTabBar'
import { PatientInfoTab } from '../components/patient/PatientInfoTab'
import { Spinner } from '../components/ui/Spinner'
import api from '../api/client'

export function PatientWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { openPatients, activePatientId, openPatient, setActivePatient } = usePatientTabsStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const exists = openPatients.find((p) => p.id === id)
    if (exists) {
      if (activePatientId !== id) setActivePatient(id)
      return
    }
    // Patient not in store — load from API and open
    setLoading(true)
    api
      .get<{ data: { pseudonym: string } }>(`/api/patients/${id}`)
      .then((res) => openPatient(id, res.data.data.pseudonym))
      .catch(() => navigate('/patients'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )

  const patient = openPatients.find((p) => p.id === id)
  if (!patient) return null

  const activeTab = patient.tabs.find((t) => t.id === patient.activeTabId)

  return (
    <div className="flex flex-col h-full">
      <PatientTabBar patientId={patient.id} tabs={patient.tabs} activeTabId={patient.activeTabId} />
      <div className="flex-1 overflow-y-auto">
        {activeTab?.type === 'info' && <PatientInfoTab patientId={patient.id} />}
        {activeTab?.type === 'protocol-new' && (
          <div className="p-4" style={{ color: '#64748B' }}>
            Новый протокол (будет подключен позже)
          </div>
        )}
        {activeTab?.type === 'protocol-saved' && (
          <div className="p-4" style={{ color: '#64748B' }}>
            Сохранённый протокол (будет подключен позже)
          </div>
        )}
      </div>
    </div>
  )
}
