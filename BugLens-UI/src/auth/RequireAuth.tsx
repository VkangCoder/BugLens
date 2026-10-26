import { useAuth } from "@/auth/useAuth";
import { Navigate, Outlet, useLocation } from "react-router";

/** Parent route: redirects to /login when signed out, remembering the requested page. */
export default function RequireAuth() {
  const { user, signedOutManually } = useAuth();
  const location = useLocation();

  if (!user) {
    // Expired / 401: remember the page to return to after sign-in. Manual sign-out: go to the home page.
    const state = signedOutManually ? undefined : { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}
