import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { Spinner } from '../components/ui/Spinner'
import { RiskBadge } from '../components/ui/RiskBadge'
import { LesionTimelineChart, type ChartPoint } from '../components/tracker/LesionTimelineChart'
import { calcVolume, calcVDT, calcGrowthPercent, formatVDT, vdtRiskColor } from '../utils/calc'
import api from '../api/client'

// ─── Типы ────────────────────────────────────────────────────

interface Timepoint {
  date: string
  report_id: string
  size_a: number
  size_b?: number
  size_c?: number
}

interface PatientInfo {
  id: string
  pseudonym: string
  birth_year: number | null
  sex: 'male' | 'female' | 'unknown'
}

interface EnrichedPoint extends ChartPoint {
  date: string
  size_b?: number
  size_c?: number
  report_id: string
}

interface EnrichedTimeline {
  name: string
  points: EnrichedPoint[]
  firstSize: number
  latestSize: number
  latestPoint: EnrichedPoint
  vdt: number | null
  growthPercent: number | null
  vdtColor: string
  vdtLabel: string
  uniqueReports: number
}

// ─── Утилиты ─────────────────────────────────────────────────

function vdtToRiskLevel(vdt: number | null): 'red' | 'orange' | 'green' | 'neutral' {
  if (vdt === null || !isFinite(vdt) || vdt < 0) return 'neutral'
  if (vdt < 100) return 'red'
  if (vdt < 400) return 'orange'
  return 'green'
}

function enrichTimelines(raw: Record<string, Timepoint[]>): EnrichedTimeline[] {
  return Object.entries(raw).map(([name, points]) => {
    const sorted = [...points].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const enrichedPoints: EnrichedPoint[] = sorted.map((p) => ({
      date: p.date,
      dateMs: new Date(p.date).getTime(),
      size_a: p.size_a,
      size_b: p.size_b,
      size_c: p.size_c,
      volume: calcVolume(p.size_a, p.size_b, p.size_c),
      report_id: p.report_id,
    }))

    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const deltaDays =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000

    const vdt = sorted.length >= 2 ? calcVDT(first.size_a, last.size_a, deltaDays) : null
    const growthPercent = sorted.length >= 2 ? calcGrowthPercent(first.size_a, last.size_a) : null

    const uniqueReports = new Set(sorted.map((p) => p.report_id)).size

    return {
      name,
      points: enrichedPoints,
      firstSize: first.size_a,
      latestSize: last.size_a,
      latestPoint: enrichedPoints[enrichedPoints.length - 1],
      vdt,
      growthPercent,
      vdtColor: vdtRiskColor(vdt),
      vdtLabel: formatVDT(vdt),
      uniqueReports,
    }
  })
}

const SEX_LABELS = { male: 'Мужской', female: 'Женский', unknown: 'Не указан' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtSize(p: EnrichedPoint) {
  const parts = [p.size_a.toFixed(1)]
  if (p.size_b) parts.push(p.size_b.toFixed(1))
  if (p.size_c) parts.push(p.size_c.toFixed(1))
  return parts.join(' × ') + ' мм'
}

// ─── Inline-компоненты ────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ color: '#E2E8F0', fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
      {sub && <div style={{ color: '#64748B', fontSize: 11 }}>{sub}</div>}
    </Card>
  )
}

// ─── Главный компонент ────────────────────────────────────────

export function PatientTrackerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [timelines, setTimelines] = useState<EnrichedTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('')

  useEffect(() => {
    if (!id) return
    api
      .get<{ data: { patient: PatientInfo; lesion_timelines: Record<string, Timepoint[]> } }>(
        `/api/patients/${id}/lesions-history`
      )
      .then(({ data: resp }) => {
        const enriched = enrichTimelines(resp.data.lesion_timelines)
        setPatient(resp.data.patient)
        setTimelines(enriched)
        if (enriched.length > 0) setActiveTab(enriched[0].name)
      })
      .catch(() => setError('Не удалось загрузить данные пациента'))
      .finally(() => setLoading(false))
  }, [id])

  const active = timelines.find((t) => t.name === activeTab)

  // Сводные даты
  const allDates = timelines.flatMap((t) => t.points.map((p) => p.dateMs))
  const periodFrom = allDates.length > 0 ? fmtDate(new Date(Math.min(...allDates)).toISOString()) : '—'
  const periodTo = allDates.length > 0 ? fmtDate(new Date(Math.max(...allDates)).toISOString()) : '—'
  const totalReports = new Set(timelines.flatMap((t) => t.points.map((p) => p.report_id))).size

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      {/* Хлебная крошка */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tracker')}>
          ← Назад к трекеру
        </Button>
      </div>

      {/* Заголовок */}
      {patient && (
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold" style={{ color: '#E2E8F0' }}>
            {patient.pseudonym}
          </h1>
          <Badge>{SEX_LABELS[patient.sex]}</Badge>
          {patient.birth_year && (
            <span style={{ color: '#64748B', fontSize: 14 }}>{patient.birth_year} г.р.</span>
          )}
        </div>
      )}

      {/* Состояния */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3">
          <Alert variant="error">{error}</Alert>
          <div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/tracker')}>
              Вернуться к трекеру
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && timelines.length === 0 && (
        <Card>
          <div className="text-center py-8" style={{ color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 15, marginBottom: 6, color: '#E2E8F0' }}>Нет данных об образованиях</div>
            <div style={{ fontSize: 13 }}>
              Протоколы с образованиями для этого пациента ещё не созданы.
              <br />
              Создайте заключение с образованиями в разделе «Заключения».
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && timelines.length > 0 && (
        <>
          {/* Сводка */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Образований" value={String(timelines.length)} />
            <StatCard label="Протоколов" value={String(totalReports)} />
            <StatCard label="Период" value={periodFrom} sub={`— ${periodTo}`} />
          </div>

          {/* Tabs */}
          <Tabs
            tabs={timelines.map((t) => ({ key: t.name, label: t.name }))}
            active={activeTab}
            onChange={setActiveTab}
          />

          {/* Активное образование */}
          {active && (
            <div className="flex flex-col gap-4">
              {/* VDT статистика */}
              <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <Card className="flex flex-col gap-2">
                  <div style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    VDT
                  </div>
                  <RiskBadge level={vdtToRiskLevel(active.vdt)} label={active.vdtLabel} large />
                </Card>
                <StatCard
                  label="Прирост"
                  value={active.growthPercent !== null ? `${active.growthPercent >= 0 ? '+' : ''}${active.growthPercent.toFixed(1)}%` : '—'}
                  sub={active.points.length >= 2 ? `${fmtDate(active.points[0].date)} → ${fmtDate(active.latestPoint.date)}` : undefined}
                />
                <StatCard
                  label="Последний размер"
                  value={`${active.latestSize.toFixed(1)} мм`}
                  sub={fmtDate(active.latestPoint.date)}
                />
                <StatCard
                  label="Объём"
                  value={`${active.latestPoint.volume.toFixed(0)} мм³`}
                  sub={fmtSize(active.latestPoint)}
                />
              </div>

              {/* График */}
              <Card glow>
                <div style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
                  Динамика размеров
                </div>
                {active.points.length >= 2 ? (
                  <LesionTimelineChart points={active.points} vdtColor={active.vdtColor} />
                ) : (
                  <div className="text-center py-8" style={{ color: '#64748B', fontSize: 13 }}>
                    Одно измерение — динамика недоступна.
                    <br />
                    Добавьте второй протокол с этим образованием для построения графика.
                  </div>
                )}
              </Card>

              {/* Таблица измерений */}
              <Card>
                <div style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>
                  История измерений
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#64748B', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>Дата</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Размер</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Объём, мм³</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>Прирост</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...active.points].reverse().map((p, idx, arr) => {
                      const prevPoint = arr[idx + 1]
                      const growth =
                        prevPoint ? calcGrowthPercent(prevPoint.size_a, p.size_a) : null
                      return (
                        <tr
                          key={p.report_id + p.dateMs}
                          style={{ borderBottom: '1px solid rgba(99,102,241,0.06)', color: '#E2E8F0' }}
                        >
                          <td style={{ padding: '8px 8px' }}>{fmtDate(p.date)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                            {fmtSize(p)}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#06B6D4' }}>
                            {p.volume.toFixed(0)}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                            {growth !== null ? (
                              <span style={{ color: growth > 0 ? '#EF4444' : growth < 0 ? '#22C55E' : '#64748B' }}>
                                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ color: '#64748B' }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
