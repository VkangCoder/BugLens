import type { AuthUser, LoginRequest } from "@/types/auth";
import { createContext } from "react";

export interface AuthContextValue {
  user: AuthUser | null;
  /** Only for showing/hiding UI. The server checks real permissions on every request. */
  isAdmin: boolean;
  /** true if the user clicked Sign out themselves (unlike expiry/401): then the page to return to is not remembered. */
  signedOutManually: boolean;
  login: (request: LoginRequest, remember: boolean) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
