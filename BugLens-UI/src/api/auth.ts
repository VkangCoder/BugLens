import { apiClient, LOGIN_PATH } from "@/api/client";
import { isLoginResponse, type LoginRequest, type LoginResponse } from "@/types/auth";

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<unknown>(LOGIN_PATH, request);
  if (!isLoginResponse(data)) throw new Error("Unexpected login response shape");
  return data;
}
