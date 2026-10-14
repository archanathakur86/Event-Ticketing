export interface LoginRequest { email: string; password: string }
export interface LoginResponse { user?: User }

export interface RegisterRequest { name?: string; fullName?: string; email: string; phone?: string; password: string }

export interface User {
  id?: string | number
  name?: string
  fullName?: string
  email?: string
  phone?: string
  profileImage?: string | null
  role?: string
  roles?: string[]
}

export interface Event {
  id?: string | number
  name?: string
  title?: string
  date?: string
  location?: string
  availableSeats?: number
  capacity?: number
  status?: string
}

export interface Ticket { id?: string | number; eventId?: string | number; userId?: string | number; ticketCode?: string; status?: string; price?: number; paymentStatus?: string; attendeeName?: string; attendeeEmail?: string; eventName?: string; qrCode?: string; raw?: any }

export interface Payment { id?: string | number; ticketId?: string | number; amount?: number; status?: string; eventId?: string | number }

export interface Attendance { id?: string | number; ticketId?: string | number; studentName?: string; status?: string }

export interface Notification { id?: string | number; title?: string; body?: string; read?: boolean }

export interface StandardApiResponse<T = any> { success?: boolean; data?: T; user?: any; message?: string }
