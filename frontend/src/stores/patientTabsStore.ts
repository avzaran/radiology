import { create } from 'zustand'

export type TabType = 'info' | 'protocol-new' | 'protocol-saved'

export interface PatientTab {
  id: string
  type: TabType
  label: string
  closable: boolean
}

export interface OpenPatient {
  id: string
  pseudonym: string
  activeTabId: string
  tabs: PatientTab[]
}

interface PatientTabsStore {
  openPatients: OpenPatient[]
  activePatientId: string | null
  openPatient: (id: string, pseudonym: string) => void
  closePatient: (id: string) => void
  setActivePatient: (id: string) => void
  addProtocolTab: (patientId: string) => void
  closeTab: (patientId: string, tabId: string) => void
  setActiveTab: (patientId: string, tabId: string) => void
  promoteProtocolTab: (patientId: string, tempTabId: string, reportId: string, date: string) => void
}

const INFO_TAB: PatientTab = { id: 'info', type: 'info', label: 'Информация', closable: false }

// TODO: upgrade to persist — add persist middleware from zustand/middleware
// import { persist } from 'zustand/middleware'
// export const usePatientTabsStore = create(persist(storeImpl, { name: 'rad-patient-tabs', version: 1 }))

export const usePatientTabsStore = create<PatientTabsStore>((set, get) => ({
  openPatients: [],
  activePatientId: null,

  openPatient: (id, pseudonym) => {
    const existing = get().openPatients.find((p) => p.id === id)
    if (existing) {
      set({ activePatientId: id })
      return
    }
    const newPatient: OpenPatient = {
      id,
      pseudonym,
      activeTabId: 'info',
      tabs: [INFO_TAB],
    }
    set((s) => ({ openPatients: [...s.openPatients, newPatient], activePatientId: id }))
  },

  closePatient: (id) => {
    set((s) => {
      const remaining = s.openPatients.filter((p) => p.id !== id)
      const newActive =
        s.activePatientId === id
          ? (remaining[remaining.length - 1]?.id ?? null)
          : s.activePatientId
      return { openPatients: remaining, activePatientId: newActive }
    })
  },

  setActivePatient: (id) => set({ activePatientId: id }),

  addProtocolTab: (patientId) => {
    const tabId = `protocol-${crypto.randomUUID()}`
    const tab: PatientTab = {
      id: tabId,
      type: 'protocol-new',
      label: 'Новый протокол',
      closable: true,
    }
    set((s) => ({
      openPatients: s.openPatients.map((p) =>
        p.id === patientId
          ? { ...p, tabs: [...p.tabs, tab], activeTabId: tabId }
          : p,
      ),
    }))
  },

  closeTab: (patientId, tabId) => {
    set((s) => ({
      openPatients: s.openPatients.map((p) => {
        if (p.id !== patientId) return p
        const tab = p.tabs.find((t) => t.id === tabId)
        if (!tab || !tab.closable) return p
        const remaining = p.tabs.filter((t) => t.id !== tabId)
        const newActive =
          p.activeTabId === tabId
            ? (remaining[remaining.length - 1]?.id ?? 'info')
            : p.activeTabId
        return { ...p, tabs: remaining, activeTabId: newActive }
      }),
    }))
  },

  setActiveTab: (patientId, tabId) => {
    set((s) => ({
      openPatients: s.openPatients.map((p) =>
        p.id === patientId ? { ...p, activeTabId: tabId } : p,
      ),
    }))
  },

  promoteProtocolTab: (patientId, tempTabId, reportId, date) => {
    set((s) => ({
      openPatients: s.openPatients.map((p) => {
        if (p.id !== patientId) return p
        return {
          ...p,
          tabs: p.tabs.map((t) =>
            t.id === tempTabId
              ? { ...t, id: `protocol-${reportId}`, type: 'protocol-saved' as TabType, label: `Протокол ${date}` }
              : t,
          ),
          activeTabId: p.activeTabId === tempTabId ? `protocol-${reportId}` : p.activeTabId,
        }
      }),
    }))
  },
}))
