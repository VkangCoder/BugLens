import { clearSession, getSession } from "@/auth/authStorage";
import axios from "axios";

export const LOGIN_PATH = "/auth/login";

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session) config.headers.set("Authorization", `Bearer ${session.token}`);
  return config;
});

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.endsWith(LOGIN_PATH)) {
      clearSession();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);
