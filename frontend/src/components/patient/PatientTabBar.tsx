import { usePatientTabsStore, type PatientTab } from '../../stores/patientTabsStore'

interface Props {
  patientId: string
  tabs: PatientTab[]
  activeTabId: string
}

export function PatientTabBar({ patientId, tabs, activeTabId }: Props) {
  const { setActiveTab, closeTab, addProtocolTab } = usePatientTabsStore()

  return (
    <div
      className="flex items-center gap-0.5 border-b px-2 overflow-x-auto shrink-0"
      style={{ borderColor: 'rgba(99,102,241,0.15)', backgroundColor: '#0A0E1A' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(patientId, tab.id)}
            className="group flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap transition-colors shrink-0"
            style={{
              color: isActive ? '#E2E8F0' : '#64748B',
              borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
              backgroundColor: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
            }}
          >
            <span>{tab.label}</span>
            {tab.closable && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(patientId, tab.id)
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-1"
                title="Закрыть вкладку"
              >
                ×
              </span>
            )}
          </button>
        )
      })}
      <button
        onClick={() => addProtocolTab(patientId)}
        className="px-3 py-2 text-xs transition-colors shrink-0"
        style={{ color: '#64748B' }}
        title="Новый протокол"
      >
        +
      </button>
    </div>
  )
}
