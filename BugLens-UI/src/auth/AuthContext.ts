import type { AuthUser, LoginRequest } from "@/types/auth";
import { createContext } from "react";

export interface AuthContextValue {
  user: AuthUser | null;
  /** Chỉ để ẩn/hiện UI. Quyền thật do server kiểm tra trên mỗi request. */
  isAdmin: boolean;
  /** true nếu người dùng tự bấm Sign out (khác với hết hạn/401): khi đó không nhớ trang để quay lại. */
  signedOutManually: boolean;
  login: (request: LoginRequest, remember: boolean) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
