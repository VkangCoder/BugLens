export const ROLES = ["Admin", "Dev"] as const;
export type Role = (typeof ROLES)[number];

export interface LoginRequest {
  name: string;
  password: string;
}

/** POST /api/v1/auth/login → LoginResponse(Token, ExpireAt, Name, Role) */
export interface LoginResponse {
  token: string;
  expireAt: string; // ISO 8601, UTC
  name: string;
  role: Role;
}

export type AuthSession = LoginResponse;

export interface AuthUser {
  name: string;
  role: Role;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.token === "string" && typeof r.expireAt === "string" && typeof r.name === "string" && isRole(r.role);
}
