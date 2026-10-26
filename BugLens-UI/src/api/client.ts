import { clearSession, getSession } from "@/auth/authStorage";
import axios from "axios";

/** Relative to baseURL (which already includes /api/v1). */
export const LOGIN_PATH = "/auth/login";

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT to every request.
apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session) config.headers.set("Authorization", `Bearer ${session.token}`);
  return config;
});

// 401 = token missing / expired / revoked → tell AuthProvider to sign out.
// Keep axios unaware of the router: AuthProvider registers the handler, RequireAuth handles the redirect.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      // A wrong password is also a 401: that is a form error, not an expired session.
      !error.config?.url?.endsWith(LOGIN_PATH)
    ) {
      clearSession();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);
