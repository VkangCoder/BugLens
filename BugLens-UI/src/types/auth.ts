export const ROLES = ["Admin", "Dev"] as const;
export type Role = (typeof ROLES)[number];

export interface LoginRequest {
  name: string;
  password: string;
}

/** POST /api/v1/auth/login → LoginResponse(Token, ExpiresAt, Name, Role) */
export interface LoginResponse {
  token: string;
  expiresAt: string; // ISO 8601, UTC
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

/** Dữ liệu từ mạng / storage là `unknown` cho tới khi qua guard này. */
export function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.token === "string" &&
    typeof r.expiresAt === "string" &&
    typeof r.name === "string" &&
    isRole(r.role)
  );
}
