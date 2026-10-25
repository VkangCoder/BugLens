import type { Role } from "@/types/auth";

/** Khớp ProjectResponse của backend (không bao giờ chứa secret). */
export interface ProjectResponse {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  keyRotatedAt: string | null;
}

/** Chỉ trả về đúng một lần khi tạo project hoặc rotate key. */
export interface ProjectWithKeyResponse extends ProjectResponse {
  ingestKey: string;
}

/** Khớp UserResponse của backend (không có password / hash). */
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
