import { api } from "./client";

export async function fetchAttendance() {
  const res = await api.get("/api/attendance");
  return Array.isArray((res as any)?.items) ? (res as any).items : (Array.isArray(res) ? res : []);
}

export async function getAttendanceByEvent(eventId: string | number) {
  if (!eventId) return { attendance: [], summary: null, event: null }
  const res = await api.get(`/api/attendance/${eventId}`)
  return {
    event: (res as any)?.event ?? null,
    summary: (res as any)?.summary ?? null,
    attendance: Array.isArray((res as any)?.attendance) ? (res as any).attendance : [],
  }
}

 export async function markAttendance(ticketCode: string | number, status: 'present' | 'absent' = 'present', ticketId?: string | number) {
  const res = await api.post('/api/attendance/mark', { ticket_code: ticketCode, ticketId, status })
  return res
}

export async function updateAttendance(id: string | number, data: any) {
  const res = await api.patch(`/api/attendance/${id}`, data)
  return res
}

export async function updateAttendanceBulk(ids: any[], data: any) {
  const res = await api.patch("/api/attendance/bulk", { ids, data });
  return res;
}

export default { fetchAttendance, updateAttendance, updateAttendanceBulk };
export async function fetchStudentAttendance(eventId?: string, userId?: string) {
  const params = new URLSearchParams();
  if (eventId) params.append('eventId', eventId);
  if (userId) params.append('userId', userId);
  const res = await api.get(`/api/attendance/students?${params.toString()}`);
  return Array.isArray((res as any)?.rows) ? (res as any).rows : [];
}
