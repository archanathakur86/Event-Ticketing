import { create } from 'zustand'

const useTicketStore = create((set, get) => ({
  selectedTicket: null,
  setSelectedTicket(ticket) { set({ selectedTicket: ticket }) },
  clearSelectedTicket() { set({ selectedTicket: null }) },
}))

export default useTicketStore
export { useTicketStore }
