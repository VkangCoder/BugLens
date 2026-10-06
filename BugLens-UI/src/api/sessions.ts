import type {
  PagedResponse,
  SessionListParams,
  SessionResponse,
  SessionSummary,
} from "@/types/session";
import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getSessions(
  params: SessionListParams = {},
): Promise<PagedResponse<SessionSummary>> {
  const response = await api.get<PagedResponse<SessionSummary>>("/sessions", { params });
  return response.data;
}

export async function getSessionById(id: string): Promise<SessionResponse> {
  const response = await api.get<SessionResponse>(`/sessions/${id}`);
  return response.data;
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/sessions/${id}`);
}
