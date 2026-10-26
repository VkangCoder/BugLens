import type { Role } from "@/types/auth";

export interface ProjectResponse {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  keyRotatedAt: string | null;
}

export interface ProjectWithKeyResponse extends ProjectResponse {
  ingestKey: string;
}

export interface UserResponse {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  password: string;
  role: Role;
}
