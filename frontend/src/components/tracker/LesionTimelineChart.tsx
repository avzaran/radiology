import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts'

export interface ChartPoint {
  dateMs: number
  size_a: number
  volume: number
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div
      style={{
        backgroundColor: '#0F172A',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        color: '#E2E8F0',
      }}
    >
      <div style={{ color: '#64748B', marginBottom: 4 }}>
        {new Date(label).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

interface LesionTimelineChartProps {
  points: ChartPoint[]
  vdtColor: string
}

export function LesionTimelineChart({ points, vdtColor }: LesionTimelineChartProps) {
  if (points.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
        <XAxis
          dataKey="dateMs"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(ms: number) =>
            new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
          }
          tick={{ fill: '#64748B', fontSize: 11 }}
        />
        <YAxis
          yAxisId="size"
          orientation="left"
          tick={{ fill: '#64748B', fontSize: 11 }}
          label={{ value: 'мм', position: 'insideTop', offset: -4, fill: '#64748B', fontSize: 11 }}
        />
        <YAxis
          yAxisId="vol"
          orientation="right"
          tick={{ fill: '#06B6D4', fontSize: 11 }}
          label={{ value: 'мм³', position: 'insideTop', offset: -4, fill: '#06B6D4', fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          yAxisId="size"
          dataKey="size_a"
          stroke={vdtColor}
          strokeWidth={2}
          dot={{ fill: vdtColor, r: 4 }}
          activeDot={{ r: 6 }}
          name="Размер (мм)"
        />
        <Line
          yAxisId="vol"
          dataKey="volume"
          stroke="#06B6D4"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          name="Объём (мм³)"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
