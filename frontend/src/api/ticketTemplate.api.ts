import { api } from "./client";

export async function getTicketTemplate() {
  const res = await api.get("/api/ticket-template");
  return (res as any)?.template || null;
}

export async function saveTicketTemplate(payload: {
  name: string;
  image_data_url: string;
  mime_type: string;
}) {
  const res = await api.put("/api/ticket-template", payload);
  return (res as any)?.template || null;
}

export default { getTicketTemplate, saveTicketTemplate };
