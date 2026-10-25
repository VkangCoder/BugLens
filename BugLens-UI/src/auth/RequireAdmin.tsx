import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/auth/useAuth";

/** Chỉ ẩn trang khỏi người không phải Admin; quyền thật vẫn do server kiểm tra ([Authorize(Roles = Admin)]). */
export default function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
