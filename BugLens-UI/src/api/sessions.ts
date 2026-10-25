import { apiClient } from "@/api/client";
import type { PagedResponse, SessionListParams, SessionResponse, SessionSummary } from "@/types/session";

export async function getSessions(params: SessionListParams = {}): Promise<PagedResponse<SessionSummary>> {
  const response = await apiClient.get<PagedResponse<SessionSummary>>("/sessions", { params });
  return response.data;
}

export async function getSessionById(id: string): Promise<SessionResponse> {
  const response = await apiClient.get<SessionResponse>(`/sessions/${id}`);
  return response.data;
}

export async function deleteSession(id: string): Promise<void> {
  await apiClient.delete(`/sessions/${id}`);
}
