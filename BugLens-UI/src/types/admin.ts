import type { Role } from "@/types/auth";

// Ingest keys are per member: see IngestKeyResponse in api/projectAccess.ts
export interface ProjectResponse {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  myActiveKeyCount: number; // keys of the signed-in user
  sessionCount: number;
  errorSessionCount: number;
  lastSessionAt: string | null;
}

export interface UserResponse {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  projects: { id: string; name: string }[] | null;
}

export interface CreateUserRequest {
  name: string;
  password: string;
  role: Role;
}
