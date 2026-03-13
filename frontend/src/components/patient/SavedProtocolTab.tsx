import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import api from '../../api/client'

const MODALITY_LABELS: Record<string, string> = {
  ct: 'КТ', mri: 'МРТ', xray: 'Рентген', us: 'УЗИ', mammography: 'Маммография',
}

interface SavedReport {
  id: string
  modality: string
  region: string | null
  contrast: boolean
  description: string
  conclusion: string
  lesions_json: Array<{
    name: string
    location?: string
    size_a: number
    size_b?: number
    size_c?: number
    volume_mm3: number
    scale_type?: string
    score?: string
  }>
  created_at: string
}

interface SavedProtocolTabProps {
  reportId: string
}

export function SavedProtocolTab({ reportId }: SavedProtocolTabProps) {
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .get<{ data: SavedReport }>(`/api/reports/${reportId}`)
      .then((res) => setReport(res.data.data))
      .catch(() => setError('Не удалось загрузить протокол'))
      .finally(() => setLoading(false))
  }, [reportId])

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )

  if (error) return <Alert variant="error" className="m-4">{error}</Alert>
  if (!report) return null

  const date = new Date(report.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 p-4">
      {/* Шапка */}
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="default">{MODALITY_LABELS[report.modality] ?? report.modality}</Badge>
          {report.region && <span className="text-sm" style={{ color: '#E2E8F0' }}>{report.region}</span>}
          <Badge variant={report.contrast ? 'warning' : 'default'}>
            {report.contrast ? 'С контрастом' : 'Без контраста'}
          </Badge>
          <span className="ml-auto text-xs" style={{ color: '#64748B' }}>{date}</span>
        </div>
      </Card>

      {/* Описание */}
      {report.description && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>Описание</h3>
          <pre className="text-sm whitespace-pre-wrap" style={{ color: '#E2E8F0', fontFamily: 'inherit' }}>
            {report.description}
          </pre>
        </Card>
      )}

      {/* Образования */}
      {report.lesions_json && report.lesions_json.length > 0 && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748B' }}>Образования</h3>
          <div className="flex flex-col gap-2">
            {report.lesions_json.map((l, i) => {
              const dims = [l.size_a, l.size_b, l.size_c].filter((v) => v != null).join(' × ')
              return (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{l.name}</span>
                    {l.location && <span className="text-xs" style={{ color: '#64748B' }}>({l.location})</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#06B6D4', fontFamily: 'JetBrains Mono, monospace' }}>
                    <span>{dims} мм</span>
                    <span>V ≈ {l.volume_mm3.toFixed(0)} мм³</span>
                    {l.scale_type && l.score && (
                      <span style={{ color: '#6366F1' }}>[{l.scale_type.toUpperCase()}: {l.score}]</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Заключение */}
      {report.conclusion && (
        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>Заключение</h3>
          <pre className="text-sm whitespace-pre-wrap" style={{ color: '#E2E8F0', fontFamily: 'inherit' }}>
            {report.conclusion}
          </pre>
        </Card>
      )}
    </div>
  )
}
