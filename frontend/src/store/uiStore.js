import { create } from 'zustand'

const useUIStore = create((set, get) => ({
  loading: false,
  error: null,
  sidebarCollapsed: false,
  modals: {},
  selectedTicket: null,

  setLoading(v) { set({ loading: !!v }) },
  setError(err) { set({ error: err }) },
  clearError() { set({ error: null }) },

  toggleSidebar() { set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })) },
  setSidebarCollapsed(v) { set({ sidebarCollapsed: !!v }) },

  openModal(name) { set(state => ({ modals: { ...state.modals, [name]: true } })) },
  closeModal(name) { set(state => ({ modals: { ...state.modals, [name]: false } })) },

  setSelectedTicket(t) { set({ selectedTicket: t }) },
  clearSelectedTicket() { set({ selectedTicket: null }) },
}))

export default useUIStore
export { useUIStore }
