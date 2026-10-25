import { isAxiosError } from "axios";

export interface ApiProblem {
  /** null khi không có response (mất mạng, CORS, TLS...). */
  status: number | null;
  message: string;
  /** Lỗi theo từng field, key đã đổi sang camelCase ("Name" -> "name"). */
  fieldErrors: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function camelCase(key: string): string {
  return key.charAt(0).toLowerCase() + key.slice(1);
}

/**
 * Chuẩn hóa lỗi từ ASP.NET Core (ProblemDetails / ValidationProblemDetails).
 * Dữ liệu mạng là unknown nên đọc từng trường qua type guard.
 */
export function parseApiProblem(error: unknown, fallback: string): ApiProblem {
  if (!isAxiosError(error)) return { status: null, message: fallback, fieldErrors: {} };
  if (!error.response) {
    return { status: null, message: "Can't reach the server. Check your connection.", fieldErrors: {} };
  }

  const { status, data } = error.response;
  const fieldErrors: Record<string, string> = {};
  let message = fallback;

  if (isRecord(data)) {
    if (typeof data.detail === "string" && data.detail) message = data.detail;
    else if (typeof data.title === "string" && data.title) message = data.title;

    if (isRecord(data.errors)) {
      for (const [key, value] of Object.entries(data.errors)) {
        const first: unknown = Array.isArray(value) ? value[0] : undefined;
        if (typeof first === "string") fieldErrors[camelCase(key)] = first;
      }
    }
  }

  if (status === 403) message = "You don't have permission to do this.";
  return { status, message, fieldErrors };
}
