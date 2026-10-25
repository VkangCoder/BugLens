import { apiClient } from "@/api/client";
import type { CreateUserRequest, UserResponse } from "@/types/admin";

export async function listUsers(): Promise<UserResponse[]> {
  const response = await apiClient.get<UserResponse[]>("/auth/users");
  return response.data;
}

export async function createUser(request: CreateUserRequest): Promise<UserResponse> {
  const response = await apiClient.post<UserResponse>("/auth/users", request);
  return response.data;
}
