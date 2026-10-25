import { useAuth } from "@/auth/useAuth";
import { Navigate, Outlet, useLocation } from "react-router";

/** Route cha: chưa đăng nhập thì chuyển sang /login, nhớ trang đang muốn vào. */
export default function RequireAuth() {
  const { user, signedOutManually } = useAuth();
  const location = useLocation();

  if (!user) {
    const state = signedOutManually ? undefined : { from: location.pathname + location.search };
    return <Navigate to='/login' replace state={state} />;
  }
  return <Outlet />;
}
