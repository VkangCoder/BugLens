import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/auth/useAuth";

export default function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to='/' replace />;
}
