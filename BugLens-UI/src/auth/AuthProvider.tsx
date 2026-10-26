import { login as loginRequest } from "@/api/auth";
import { setUnauthorizedHandler } from "@/api/client";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";
import { clearSession, restoreSession, setSession } from "@/auth/authStorage";
import type { AuthSession, LoginRequest } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<AuthSession | null>(restoreSession);
  const [signedOutManually, setSignedOutManually] = useState(false);

  const endSession = useCallback(() => {
    clearSession();
    setSessionState(null);
    queryClient.clear();
  }, [queryClient]);

  const logout = useCallback(() => {
    setSignedOutManually(true);
    endSession();
  }, [endSession]);

  const login = useCallback(async (request: LoginRequest, remember: boolean) => {
    const result = await loginRequest(request);
    setSession(result, remember);
    setSignedOutManually(false);
    setSessionState(result);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(endSession);
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  useEffect(() => {
    if (!session) return;
    const remaining = Date.parse(session.expireAt) - Date.now();
    const id = window.setTimeout(endSession, Math.max(remaining, 0));
    return () => window.clearTimeout(id);
  }, [session, endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session ? { name: session.name, role: session.role } : null,
      isAdmin: session?.role === "Admin",
      signedOutManually,
      login,
      logout,
    }),
    [session, signedOutManually, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
