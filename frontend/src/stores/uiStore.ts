import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  isOnline: boolean
  setSidebarOpen: (open: boolean) => void
  setOnline: (online: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  isOnline: navigator.onLine,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setOnline: (online) => set({ isOnline: online }),
}))
