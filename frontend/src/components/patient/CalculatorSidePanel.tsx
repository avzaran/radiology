import { useState } from 'react'
import { Tabs } from '../ui/Tabs'
import { CalcResultPanel } from './CalcResultPanel'
import { TiRadsCalculator } from '../calculators/TiRadsCalculator'
import { FleischnerCalculator } from '../calculators/FleischnerCalculator'
import { PiRadsCalculator } from '../calculators/PiRadsCalculator'
import { LungRadsCalculator } from '../calculators/LungRadsCalculator'

const CALC_TABS = [
  { key: 'tirads',     label: 'TI-RADS' },
  { key: 'fleischner', label: 'Fleischner' },
  { key: 'pirads',     label: 'Pi-RADS' },
  { key: 'lungrads',   label: 'Lung-RADS' },
]

interface CalculatorSidePanelProps {
  onClose: () => void
}

export function CalculatorSidePanel({ onClose }: CalculatorSidePanelProps) {
  const [activeCalc, setActiveCalc] = useState('tirads')

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        backgroundColor: '#0F172A',
        borderLeft: '1px solid rgba(99,102,241,0.15)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
        <span className="text-sm font-semibold" style={{ color: '#E2E8F0' }}>Калькуляторы</span>
        <button
          onClick={onClose}
          className="text-sm px-2 py-1 rounded hover:bg-white/5 transition-colors"
          style={{ color: '#64748B' }}
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-3">
        <Tabs tabs={CALC_TABS} active={activeCalc} onChange={setActiveCalc} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeCalc === 'tirads'     && <TiRadsCalculator ResultPanel={CalcResultPanel} />}
        {activeCalc === 'fleischner' && <FleischnerCalculator ResultPanel={CalcResultPanel} />}
        {activeCalc === 'pirads'     && <PiRadsCalculator ResultPanel={CalcResultPanel} />}
        {activeCalc === 'lungrads'   && <LungRadsCalculator ResultPanel={CalcResultPanel} />}
      </div>
    </div>
  )
}
