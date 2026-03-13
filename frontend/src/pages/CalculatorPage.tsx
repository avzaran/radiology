import { useParams, useNavigate } from 'react-router-dom'
import { Tabs } from '../components/ui/Tabs'
import { CalcResultPanel } from '../components/patient/CalcResultPanel'
import { TiRadsCalculator } from '../components/calculators/TiRadsCalculator'
import { FleischnerCalculator } from '../components/calculators/FleischnerCalculator'
import { PiRadsCalculator } from '../components/calculators/PiRadsCalculator'
import { LungRadsCalculator } from '../components/calculators/LungRadsCalculator'

const CALC_TABS = [
  { key: 'tirads',     label: 'TI-RADS' },
  { key: 'fleischner', label: 'Fleischner' },
  { key: 'pirads',     label: 'Pi-RADS' },
  { key: 'lungrads',   label: 'Lung-RADS' },
]

// ─── CalculatorPage ───────────────────────────────────────────────────────────

export function CalculatorPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()

  const activeType = type ?? 'tirads'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-4" style={{ color: '#E2E8F0' }}>
          Калькуляторы шкал
        </h1>
        <Tabs
          tabs={CALC_TABS}
          active={activeType}
          onChange={(key) => navigate(`/calculator/${key}`)}
        />
      </div>

      {activeType === 'tirads'     && <TiRadsCalculator ResultPanel={CalcResultPanel} />}
      {activeType === 'fleischner' && <FleischnerCalculator ResultPanel={CalcResultPanel} />}
      {activeType === 'pirads'     && <PiRadsCalculator ResultPanel={CalcResultPanel} />}
      {activeType === 'lungrads'   && <LungRadsCalculator ResultPanel={CalcResultPanel} />}
    </div>
  )
}
