import { apiClient } from "@/api/client";
import type { ProjectResponse, ProjectWithKeyResponse } from "@/types/admin";

export async function listProjects(): Promise<ProjectResponse[]> {
  const response = await apiClient.get<ProjectResponse[]>("/projects");
  return response.data;
}

export async function createProject(name: string): Promise<ProjectWithKeyResponse> {
  const response = await apiClient.post<ProjectWithKeyResponse>("/projects", { name });
  return response.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${encodeURIComponent(id)}`);
}

export async function rotateProjectKey(id: string): Promise<ProjectWithKeyResponse> {
  const response = await apiClient.post<ProjectWithKeyResponse>(`/projects/${encodeURIComponent(id)}/rotate-key`);
  return response.data;
}
