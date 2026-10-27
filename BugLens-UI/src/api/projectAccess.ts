import { apiClient } from "@/api/client";

export interface ProjectMemberResponse {
  userId: string;
  userName: string;
  role: string;
  addedByUserId: string;
  createdAt: string;
}

export interface IngestKeyResponse {
  id: string;
  projectId: string;
  ownerUserId: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedIngestKeyResponse extends IngestKeyResponse {
  secret: string;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberResponse[]> {
  const { data } = await apiClient.get<ProjectMemberResponse[]>(`/projects/${encodeURIComponent(projectId)}/members`);
  return data;
}

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
  await apiClient.post(`/projects/${encodeURIComponent(projectId)}/members`, { userId });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await apiClient.delete(`/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`);
}

export async function listIngestKeys(projectId: string): Promise<IngestKeyResponse[]> {
  const { data } = await apiClient.get<IngestKeyResponse[]>(`/projects/${encodeURIComponent(projectId)}/keys`);
  return data;
}

export async function createIngestKey(projectId: string, name: string): Promise<CreatedIngestKeyResponse> {
  const { data } = await apiClient.post<CreatedIngestKeyResponse>(`/projects/${encodeURIComponent(projectId)}/keys`, {
    name,
  });
  return data;
}

export async function revokeIngestKey(projectId: string, keyId: string): Promise<void> {
  await apiClient.delete(`/projects/${encodeURIComponent(projectId)}/keys/${encodeURIComponent(keyId)}`);
}
