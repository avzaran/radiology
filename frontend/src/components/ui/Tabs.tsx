interface Tab {
  key: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.05)',
              color: isActive ? '#6366F1' : '#64748B',
              border: `1px solid ${isActive ? '#6366F1' : 'rgba(99,102,241,0.1)'}`,
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
