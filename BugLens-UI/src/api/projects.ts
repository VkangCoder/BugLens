import { apiClient } from "@/api/client";
import type { ProjectResponse } from "@/types/admin";

export async function listProjects(): Promise<ProjectResponse[]> {
  const response = await apiClient.get<ProjectResponse[]>("/projects");
  return response.data;
}

export async function createProject(name: string): Promise<ProjectResponse> {
  const response = await apiClient.post<ProjectResponse>("/projects", { name });
  return response.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${encodeURIComponent(id)}`);
}
